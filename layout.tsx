"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { recommendRehabPlan } from "@/ai/flows/recommend-rehab-plan";
import { Textarea } from "@/components/ui/textarea";

export default function AdminInterface() {
  const [userHealthData, setUserHealthData] = useState("");
  const [userNeeds, setUserNeeds] = useState("");
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    const getRecommendation = async () => {
      if (userHealthData && userNeeds) {
        const result = await recommendRehabPlan({ healthData: userHealthData, needs: userNeeds });
        setRecommendation(result);
      }
    };

    getRecommendation();
  }, [userHealthData, userNeeds]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4">
      <h1 className="text-3xl font-bold text-primary mb-4">
        管理界面
      </h1>
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-md bg-muted">
          <h2 className="text-xl font-semibold text-foreground">
            管理康复计划
          </h2>
          <p className="text-foreground">
            添加、编辑和删除康复计划的功能。
          </p>
        </div>
        <div className="p-4 border rounded-md bg-muted">
          <h2 className="text-xl font-semibold text-foreground">
            管理用户数据
          </h2>
          <p className="text-foreground">
            查看、编辑和删除用户数据的功能。
          </p>
        </div>
        <div className="p-4 border rounded-md bg-muted">
          <h2 className="text-xl font-semibold text-foreground">
            系统设置
          </h2>
          <p className="text-foreground">
            配置系统设置的功能。
          </p>
        </div>
        <div className="p-4 border rounded-md bg-muted">
          <h2 className="text-xl font-semibold text-foreground">
            模型管理
          </h2>
          <p className="text-foreground">
            管理和更新AI模型。
          </p>
        </div>
        <div className="p-4 border rounded-md bg-muted">
          <h2 className="text-xl font-semibold text-foreground">
            康复AI智能体
          </h2>
          <p className="text-foreground">
            输入用户数据以获得康复建议。
          </p>
          <Textarea
            id="userHealthData"
            placeholder="输入用户健康信息"
            value={userHealthData}
            onChange={(e) => setUserHealthData(e.target.value)}
            className="mb-2"
          />
          <Textarea
            id="userNeeds"
            placeholder="输入用户康复需求"
            value={userNeeds}
            onChange={(e) => setUserNeeds(e.target.value)}
            className="mb-2"
          />
          {recommendation ? (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-foreground">
                推荐计划:
              </h3>
              <p className="text-foreground">{recommendation.recommendedPlan}</p>
              <h4 className="text-md font-semibold text-foreground mt-2">
                原因:
              </h4>
              <p className="text-foreground">{recommendation.reason}</p>
            </div>
          ) : (
            <p className="text-foreground">输入用户数据以获得康复建议。</p>
          )}
          <Button onClick={() => getRecommendation()}>获取康复建议</Button>
        </div>
      </div>
    </div>
  );
}
