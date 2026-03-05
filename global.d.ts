import { Pose } from '@tensorflow-models/pose-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import { debugManager } from '@/lib/debug-manager';

export interface MotionFeedback {
  isCorrect: boolean;
  feedback: string;
  confidence: number;
}

// 预定义的目标姿势
const TARGET_POSES = {
  squat: {
    keypoints: [
      { name: 'nose', position: { x: 0.5, y: 0.2 } },
      { name: 'left_shoulder', position: { x: 0.3, y: 0.3 } },
      { name: 'right_shoulder', position: { x: 0.7, y: 0.3 } },
      { name: 'left_hip', position: { x: 0.3, y: 0.6 } },
      { name: 'right_hip', position: { x: 0.7, y: 0.6 } },
      { name: 'left_knee', position: { x: 0.3, y: 0.8 } },
      { name: 'right_knee', position: { x: 0.7, y: 0.8 } },
      { name: 'left_ankle', position: { x: 0.3, y: 1.0 } },
      { name: 'right_ankle', position: { x: 0.7, y: 1.0 } },
    ],
  },
  // 可以添加更多预定义姿势
};

export class MotionDetectionService {
  private static instance: MotionDetectionService;
  private detector: poseDetection.PoseDetector | null = null;
  private targetPoseCache: Map<string, Pose> = new Map();
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): MotionDetectionService {
    if (!MotionDetectionService.instance) {
      MotionDetectionService.instance = new MotionDetectionService();
    }
    return MotionDetectionService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.detector) {
      debugManager.publish('姿势检测器已初始化');
      return;
    }

    if (this.isInitializing) {
      debugManager.publish('姿势检测器正在初始化中...');
      return this.initializationPromise!;
    }

    this.isInitializing = true;
    this.initializationPromise = (async () => {
      try {
        debugManager.publish('正在初始化 TensorFlow.js...');
        await tf.ready();
        debugManager.publish('TensorFlow.js 已准备就绪');

        debugManager.publish('正在设置 WebGL 后端...');
        const backend = await tf.setBackend('webgl');
        debugManager.publish(`使用后端: ${backend}`);

        debugManager.publish('正在创建姿势检测器...');
        this.detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
          }
        );
        debugManager.publish('姿势检测器已初始化');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        debugManager.publish(`初始化失败: ${errorMessage}`);
        console.error('初始化失败:', error);
        throw new Error('无法初始化姿势检测器，请检查浏览器兼容性和网络连接');
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initializationPromise;
  }

  public async detectPose(canvas: HTMLCanvasElement): Promise<Pose | null> {
    if (!this.detector) {
      debugManager.publish('检测器未初始化，正在初始化...');
      await this.initialize();
    }

    try {
      if (!this.detector) {
        throw new Error('姿势检测器未初始化');
      }

      debugManager.publish('正在检测姿势...');
      const poses = await this.detector.estimatePoses(canvas);
      
      if (!poses || poses.length === 0) {
        debugManager.publish('未检测到姿势');
        return null;
      }

      // 验证检测到的姿势是否有效
      const pose = poses[0];
      if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
        debugManager.publish('检测到的姿势无效');
        return null;
      }

      // 检查关键点的置信度
      const validKeypoints = pose.keypoints.filter(kp => kp.score && kp.score > 0.3);
      if (validKeypoints.length < 5) {
        debugManager.publish(`检测到的有效关键点数量不足: ${validKeypoints.length}`);
        return null;
      }

      debugManager.publish(`成功检测到姿势，有效关键点数量: ${validKeypoints.length}`);
      return pose;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      debugManager.publish(`姿势检测失败: ${errorMessage}`);
      console.error('姿势检测失败:', error);
      return null;
    }
  }

  public async getTargetPose(exerciseType: string): Promise<Pose> {
    if (this.targetPoseCache.has(exerciseType)) {
      return this.targetPoseCache.get(exerciseType)!;
    }

    const targetPose = TARGET_POSES[exerciseType as keyof typeof TARGET_POSES];
    if (!targetPose) {
      throw new Error(`未找到运动类型 ${exerciseType} 的目标姿势`);
    }

    const pose: Pose = {
      keypoints: targetPose.keypoints.map(kp => ({
        name: kp.name,
        score: 1,
        x: kp.position.x,
        y: kp.position.y,
      })),
      score: 1,
    };

    this.targetPoseCache.set(exerciseType, pose);
    return pose;
  }

  public async evaluateMotion(pose: Pose): Promise<MotionFeedback> {
    try {
      if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
        throw new Error('无效的姿势数据');
      }

      debugManager.publish('正在获取目标姿势...');
      const targetPose = await this.getTargetPose('squat');
      
      debugManager.publish('正在计算关键点差异...');
      const differences = this.calculateKeypointDifferences(pose, targetPose);
      
      debugManager.publish('正在分析姿势...');
      const { isCorrect, feedback, confidence } = this.analyzePose(differences);

      debugManager.publish(`姿势评估结果: ${isCorrect ? '正确' : '需要调整'}, 置信度: ${confidence.toFixed(2)}`);
      debugManager.publish(`反馈: ${feedback}`);

      return {
        isCorrect,
        feedback,
        confidence,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      debugManager.publish(`姿势评估失败: ${errorMessage}`);
      console.error('姿势评估失败:', error);
      return {
        isCorrect: false,
        feedback: '无法评估动作，请重试',
        confidence: 0,
      };
    }
  }

  private calculateKeypointDifferences(
    currentPose: Pose,
    targetPose: Pose
  ): Map<string, { distance: number; direction: string }> {
    const differences = new Map<string, { distance: number; direction: string }>();

    for (const targetKp of targetPose.keypoints) {
      const currentKp = currentPose.keypoints.find(kp => kp.name === targetKp.name);
      if (currentKp && currentKp.score && currentKp.score > 0.3 && currentKp.name) {
        const dx = currentKp.x - targetKp.x;
        const dy = currentKp.y - targetKp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let direction = '';
        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? '右' : '左';
        } else {
          direction = dy > 0 ? '下' : '上';
        }

        differences.set(currentKp.name, { distance, direction });
      }
    }

    return differences;
  }

  private analyzePose(
    differences: Map<string, { distance: number; direction: string }>
  ): {
    isCorrect: boolean;
    feedback: string;
    confidence: number;
  } {
    const THRESHOLD = 0.15;
    const feedbacks: string[] = [];

    // 计算平均差异
    let totalDifference = 0;
    let count = 0;
    differences.forEach(diff => {
      totalDifference += diff.distance;
      count++;
    });

    const averageDifference = count > 0 ? totalDifference / count : THRESHOLD;
    const confidence = Math.max(0, 1 - averageDifference / THRESHOLD);

    // 生成反馈
    if (averageDifference < THRESHOLD) {
      feedbacks.push('动作正确！请继续保持');
    } else {
      differences.forEach((diff, keypoint) => {
        if (diff.distance > THRESHOLD) {
          feedbacks.push(`${keypoint}需要向${diff.direction}移动`);
        }
      });
    }

    return {
      isCorrect: averageDifference < THRESHOLD,
      feedback: feedbacks.join('\n'),
      confidence,
    };
  }
}

// 导出单例实例
export const motionDetectionService = MotionDetectionService.getInstance(); 