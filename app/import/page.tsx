"use client";

import { useState } from "react";
import { BookOpen, FileCode2, FileText, Scissors, type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImportOption = {
  id: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  accent: string;
  iconClassName: string;
};

const importOptions: ImportOption[] = [
  {
    id: "pdf",
    title: "PDF",
    description: "从 PDF 中提取文字，整理成可继续编辑的阅读资料。",
    detail: "将支持文件校验、文字提取与私有文件存储。",
    icon: FileText,
    accent: "border-[#dfd5c5] bg-[#f3ede2]",
    iconClassName: "bg-[#e9ddcd] text-[#7b664e]",
  },
  {
    id: "text",
    title: "TXT / Markdown",
    description: "导入纯文本或 Markdown，保留章节与段落结构。",
    detail: "将支持编码检查、大小限制与重复内容检测。",
    icon: FileCode2,
    accent: "border-[#d8dfd2] bg-[#eef2e9]",
    iconClassName: "bg-[#dfe8d8] text-[#5b7052]",
  },
  {
    id: "weread",
    title: "微信读书",
    description: "从官方 Agent Skill 受控导入书架、划线与阅读统计。",
    detail: "仅在官方能力核验完成后开放，手动导入始终保留。",
    icon: BookOpen,
    accent: "border-[#dcd8c8] bg-[#f1eee3]",
    iconClassName: "bg-[#e7e1d0] text-[#716448]",
  },
  {
    id: "clip",
    title: "浏览器剪藏",
    description: "通过 Chrome 扩展主动选择网页片段，保存为笔记草稿。",
    detail: "只导入用户主动选择的内容，不读取 Cookie 或历史记录。",
    icon: Scissors,
    accent: "border-[#ded8d2] bg-[#f4efec]",
    iconClassName: "bg-[#e9dfd9] text-[#776157]",
  },
];

export default function ImportPage() {
  const [activeOption, setActiveOption] = useState<ImportOption | null>(null);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="导入中心"
        description="把散落在不同格式和平台里的阅读资料带回来。当前仅展示入口与后续能力说明。"
        action={
          <Badge
            variant="outline"
            className="border-[#d8d2c4] bg-[#f5f1e7] text-[#77796f]"
          >
            当前为入口占位
          </Badge>
        }
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {importOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              className="h-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#7b8b70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3]"
              onClick={() => setActiveOption(option)}
            >
              <Card
                className={`h-full gap-0 border p-6 transition-colors hover:border-[#aeb9a4] ${option.accent}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`flex size-11 items-center justify-center rounded-2xl ${option.iconClassName}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <Badge
                    variant="outline"
                    className="border-white/70 bg-white/45 text-[10px] font-normal text-[#74766c]"
                  >
                    后续开放
                  </Badge>
                </div>
                <h2 className="mt-6 font-serif text-2xl font-semibold text-[#34382f]">
                  {option.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#656a60]">
                  {option.description}
                </p>
                <p className="mt-4 border-t border-[#d8d2c4]/60 pt-4 text-xs leading-6 text-[#84867c]">
                  {option.detail}
                </p>
              </Card>
            </button>
          );
        })}
      </div>

      <p className="mt-8 rounded-xl border border-dashed border-[#d8d2c4] bg-[#f7f3ea]/70 px-5 py-4 text-xs leading-6 text-[#7f8177]">
        本页不会上传文件、读取浏览器数据或调用外部接口。导入能力分别在阶段 5、6、7
        实现。
      </p>

      <Dialog
        open={activeOption !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveOption(null);
          }
        }}
      >
        <DialogContent className="border border-[#ded8ca] bg-[#fffdf8]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#30342c]">
              {activeOption?.title ?? "导入功能"}
            </DialogTitle>
            <DialogDescription>
              该功能将在后续阶段开放。
              {activeOption ? ` ${activeOption.detail}` : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
              onClick={() => setActiveOption(null)}
            >
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}