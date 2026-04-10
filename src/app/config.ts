export const APP_TITLE = "晚自习带班老师测评";

// 视频文件建议放到 `public/videos/` 下，然后在这里填相对路径，例如：
// "/videos/intro-01.mp4"
export const INTRO_VIDEOS: string[] = ["/videos/intro.mp4"];

export const RESULT_VIDEOS: string[] = ["/videos/outro.mp4"];

// Page2 题目数据（示例）。后续你给题库时替换这里即可。
import type { Question } from "./quiz";

export const QUESTIONS: Question[] = [
  {
    id: "sunflower-1",
    type: "single",
    sceneName: "我不会",
    stem: "《向日葵上的房子》：这个故事一共有（    ）个自然段？",
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "5" },
      { key: "C", text: "6" }
    ],
    correctKey: "C"
  },
  {
    id: "sunflower-2",
    type: "single",
    sceneName: "我不会",
    stem: "《向日葵上的房子》：蚂蚁奶奶原来的房子有什么问题？",
    options: [
      { key: "A", text: "没有窗户，透不进风" },
      { key: "B", text: "没有阳光，又黑又暗" },
      { key: "C", text: "太小了，住不下小蚂蚁" }
    ],
    correctKey: "B"
  },
  {
    id: "sunflower-3",
    type: "single",
    sceneName: "我不会",
    stem: "《向日葵上的房子》：小蚂蚁们每天都会做什么来照顾蚂蚁奶奶？",
    options: [
      { key: "A", text: "给奶奶做饭吃" },
      { key: "B", text: "抬着奶奶去晒太阳" },
      { key: "C", text: "帮奶奶打扫房子" }
    ],
    correctKey: "B"
  },
  {
    id: "sunflower-4",
    type: "single",
    sceneName: "我不会",
    stem: "《向日葵上的房子》：小蚂蚁们把蚂蚁奶奶的房子搬到了哪里？",
    options: [
      { key: "A", text: "小河边" },
      { key: "B", text: "向日葵的花盘上" },
      { key: "C", text: "草地上" }
    ],
    correctKey: "B"
  },
  {
    id: "sunflower-5",
    type: "single",
    sceneName: "我不会",
    stem: "《向日葵上的房子》：中午的时候，阳光照在了哪里？",
    options: [
      { key: "A", text: "床上" },
      { key: "B", text: "窗口" },
      { key: "C", text: "蚂蚁奶奶身上" }
    ],
    correctKey: "A"
  },
  {
    id: "sunflower-6",
    type: "single",
    sceneName: "我不会",
    stem: "《向日葵上的房子》：小蚂蚁们抬着蚂蚁奶奶晒太阳，给她搬家，体现了（              ）",
    options: [
      { key: "A", text: "小蚂蚁们对蚂蚁奶奶的关爱" },
      { key: "B", text: "小蚂蚁们的勤劳" }
    ],
    correctKey: "A"
  }
];

