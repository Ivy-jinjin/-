import { Pose } from '@tensorflow-models/pose-detection';

export interface RehabMotionFeedback {
  isCorrect: boolean;
  feedback: string;
  confidence: number;
  motionType: string;
}

// 预定义的康复运动类型
export enum RehabMotionType {
  CHEST_EXPANSION = 'chest-expansion', // 扩胸运动
  BODY_ROTATION = 'body-rotation',    // 左右转体
}

// 预定义的目标姿势
const TARGET_POSES = {
  [RehabMotionType.CHEST_EXPANSION]: {
    keypoints: [
      { name: 'nose', position: { x: 0.5, y: 0.2 } },
      { name: 'left_shoulder', position: { x: 0.2, y: 0.3 } },
      { name: 'right_shoulder', position: { x: 0.8, y: 0.3 } },
      { name: 'left_elbow', position: { x: 0.1, y: 0.4 } },
      { name: 'right_elbow', position: { x: 0.9, y: 0.4 } },
      { name: 'left_wrist', position: { x: 0.0, y: 0.5 } },
      { name: 'right_wrist', position: { x: 1.0, y: 0.5 } },
    ],
  },
  [RehabMotionType.BODY_ROTATION]: {
    keypoints: [
      { name: 'nose', position: { x: 0.5, y: 0.2 } },
      { name: 'left_shoulder', position: { x: 0.3, y: 0.3 } },
      { name: 'right_shoulder', position: { x: 0.7, y: 0.3 } },
      { name: 'left_hip', position: { x: 0.3, y: 0.6 } },
      { name: 'right_hip', position: { x: 0.7, y: 0.6 } },
    ],
  },
};

export class RehabMotionDetectionService {
  private static instance: RehabMotionDetectionService;
  private targetPoseCache: Map<string, Pose> = new Map();
  private motionHistory: Map<string, Pose[]> = new Map();
  private readonly HISTORY_LENGTH = 10;

  private constructor() {}

  public static getInstance(): RehabMotionDetectionService {
    if (!RehabMotionDetectionService.instance) {
      RehabMotionDetectionService.instance = new RehabMotionDetectionService();
    }
    return RehabMotionDetectionService.instance;
  }

  public async getTargetPose(motionType: RehabMotionType): Promise<Pose> {
    if (this.targetPoseCache.has(motionType)) {
      return this.targetPoseCache.get(motionType)!;
    }

    const targetPose = TARGET_POSES[motionType];
    if (!targetPose) {
      throw new Error(`未找到运动类型 ${motionType} 的目标姿势`);
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

    this.targetPoseCache.set(motionType, pose);
    return pose;
  }

  public async evaluateMotion(
    currentPose: Pose,
    motionType: RehabMotionType
  ): Promise<RehabMotionFeedback> {
    try {
      // 更新运动历史
      this.updateMotionHistory(motionType, currentPose);

      // 获取目标姿势
      const targetPose = await this.getTargetPose(motionType);

      // 计算关键点差异
      const differences = this.calculateKeypointDifferences(currentPose, targetPose);

      // 分析运动轨迹
      const trajectoryAnalysis = this.analyzeMotionTrajectory(motionType);

      // 评估姿势
      const { isCorrect, feedback, confidence } = this.analyzePose(
        differences,
        trajectoryAnalysis,
        motionType
      );

      return {
        isCorrect,
        feedback,
        confidence,
        motionType,
      };
    } catch (error) {
      console.error('康复运动评估失败:', error);
      return {
        isCorrect: false,
        feedback: '无法评估动作，请重试',
        confidence: 0,
        motionType,
      };
    }
  }

  private updateMotionHistory(motionType: string, pose: Pose) {
    if (!this.motionHistory.has(motionType)) {
      this.motionHistory.set(motionType, []);
    }

    const history = this.motionHistory.get(motionType)!;
    history.push(pose);

    if (history.length > this.HISTORY_LENGTH) {
      history.shift();
    }
  }

  private calculateKeypointDifferences(
    currentPose: Pose,
    targetPose: Pose
  ): Map<string, { distance: number; direction: string }> {
    const differences = new Map<string, { distance: number; direction: string }>();

    for (const targetKp of targetPose.keypoints) {
      const currentKp = currentPose.keypoints.find(kp => kp.name === targetKp.name);
      if (currentKp) {
        const dx = currentKp.x - targetKp.x;
        const dy = currentKp.y - targetKp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let direction = '';
        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? '右' : '左';
        } else {
          direction = dy > 0 ? '下' : '上';
        }

        differences.set(targetKp.name, { distance, direction });
      }
    }

    return differences;
  }

  private analyzeMotionTrajectory(motionType: string): {
    isSmooth: boolean;
    amplitude: number;
    speed: number;
  } {
    const history = this.motionHistory.get(motionType) || [];
    if (history.length < 2) {
      return { isSmooth: true, amplitude: 0, speed: 0 };
    }

    // 计算运动幅度
    let maxAmplitude = 0;
    for (let i = 1; i < history.length; i++) {
      const prevPose = history[i - 1];
      const currPose = history[i];
      
      for (const kp of currPose.keypoints) {
        const prevKp = prevPose.keypoints.find(p => p.name === kp.name);
        if (prevKp) {
          const dx = kp.x - prevKp.x;
          const dy = kp.y - prevKp.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          maxAmplitude = Math.max(maxAmplitude, distance);
        }
      }
    }

    // 计算运动速度
    const speed = maxAmplitude / history.length;

    // 判断运动是否平滑
    const isSmooth = speed < 0.1; // 阈值可调整

    return {
      isSmooth,
      amplitude: maxAmplitude,
      speed,
    };
  }

  private analyzePose(
    differences: Map<string, { distance: number; direction: string }>,
    trajectory: { isSmooth: boolean; amplitude: number; speed: number },
    motionType: RehabMotionType
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

    // 根据运动类型生成特定反馈
    switch (motionType) {
      case RehabMotionType.CHEST_EXPANSION:
        this.analyzeChestExpansion(differences, trajectory, feedbacks);
        break;
      case RehabMotionType.BODY_ROTATION:
        this.analyzeBodyRotation(differences, trajectory, feedbacks);
        break;
    }

    if (feedbacks.length === 0) {
      feedbacks.push('动作正确！请继续保持');
    }

    return {
      isCorrect: averageDifference < THRESHOLD && trajectory.isSmooth,
      feedback: feedbacks.join('\n'),
      confidence,
    };
  }

  private analyzeChestExpansion(
    differences: Map<string, { distance: number; direction: string }>,
    trajectory: { isSmooth: boolean; amplitude: number; speed: number },
    feedbacks: string[]
  ) {
    const leftShoulderDiff = differences.get('left_shoulder');
    const rightShoulderDiff = differences.get('right_shoulder');
    const leftElbowDiff = differences.get('left_elbow');
    const rightElbowDiff = differences.get('right_elbow');

    if (leftShoulderDiff && leftShoulderDiff.distance > 0.15) {
      feedbacks.push(`左肩需要向${leftShoulderDiff.direction}移动`);
    }
    if (rightShoulderDiff && rightShoulderDiff.distance > 0.15) {
      feedbacks.push(`右肩需要向${rightShoulderDiff.direction}移动`);
    }
    if (leftElbowDiff && leftElbowDiff.distance > 0.15) {
      feedbacks.push(`左肘需要向${leftElbowDiff.direction}移动`);
    }
    if (rightElbowDiff && rightElbowDiff.distance > 0.15) {
      feedbacks.push(`右肘需要向${rightElbowDiff.direction}移动`);
    }

    if (!trajectory.isSmooth) {
      feedbacks.push('请保持动作平稳，不要过快');
    }
    if (trajectory.amplitude < 0.3) {
      feedbacks.push('请加大扩胸幅度');
    }
  }

  private analyzeBodyRotation(
    differences: Map<string, { distance: number; direction: string }>,
    trajectory: { isSmooth: boolean; amplitude: number; speed: number },
    feedbacks: string[]
  ) {
    const leftShoulderDiff = differences.get('left_shoulder');
    const rightShoulderDiff = differences.get('right_shoulder');
    const leftHipDiff = differences.get('left_hip');
    const rightHipDiff = differences.get('right_hip');

    if (leftShoulderDiff && leftShoulderDiff.distance > 0.15) {
      feedbacks.push(`左肩需要向${leftShoulderDiff.direction}移动`);
    }
    if (rightShoulderDiff && rightShoulderDiff.distance > 0.15) {
      feedbacks.push(`右肩需要向${rightShoulderDiff.direction}移动`);
    }
    if (leftHipDiff && leftHipDiff.distance > 0.15) {
      feedbacks.push(`左髋需要向${leftHipDiff.direction}移动`);
    }
    if (rightHipDiff && rightHipDiff.distance > 0.15) {
      feedbacks.push(`右髋需要向${rightHipDiff.direction}移动`);
    }

    if (!trajectory.isSmooth) {
      feedbacks.push('请保持动作平稳，不要过快');
    }
    if (trajectory.amplitude < 0.2) {
      feedbacks.push('请加大转体幅度');
    }
  }
}

// 导出单例实例
export const rehabMotionDetectionService = RehabMotionDetectionService.getInstance(); 