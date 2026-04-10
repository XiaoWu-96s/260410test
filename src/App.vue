<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PageKey } from "./app/types";
import { APP_TITLE, INTRO_VIDEOS, QUESTIONS, RESULT_VIDEOS } from "./app/config";
import type { AnswerRecord, OptionKey, Question } from "./app/quiz";

const BASE_W = 1920;
const BASE_H = 1080;

const page = ref<PageKey>("intro");

const viewportW = ref(window.innerWidth);
const viewportH = ref(window.innerHeight);
const scale = computed(() => Math.min(viewportW.value / BASE_W, viewportH.value / BASE_H));
const stageStyle = computed(() => ({
  width: `${BASE_W}px`,
  height: `${BASE_H}px`,
  transform: `translate(-50%, -50%) scale(${scale.value})`
}));

function onResize() {
  viewportW.value = window.innerWidth;
  viewportH.value = window.innerHeight;
}

onMounted(() => {
  document.title = APP_TITLE;
  window.addEventListener("resize", onResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});

function go(next: PageKey) {
  page.value = next;
}

const sceneTitle = computed(() => {
  switch (page.value) {
    case "intro":
      return "视频引导";
    case "quiz":
      return "晚自习作答";
    case "resultVideo":
      return "结果引导";
    case "reward":
      return "激励";
    default:
      return "";
  }
});

const quizIndex = ref(0);
const quizQuestion = computed<Question | null>(() => QUESTIONS[quizIndex.value] || null);
const quizTotal = computed(() => QUESTIONS.length);
const answers = ref<AnswerRecord[]>([]);

const singleQ = computed(() => {
  const q = quizQuestion.value;
  return q && q.type === "single" ? q : null;
});
const dragQ = computed(() => {
  const q = quizQuestion.value;
  return q && q.type === "dragSingle" ? q : null;
});
const judgeQ = computed(() => {
  const q = quizQuestion.value;
  return q && q.type === "judgeThenSingle" ? q : null;
});

const feedback = ref<null | { ok: boolean; text: string }>(null);
const canContinue = computed(() => feedback.value !== null);

function resetFeedback() {
  feedback.value = null;
}

function finishQuiz() {
  go("resultVideo");
}

function nextQuestion() {
  resetFeedback();
  if (quizIndex.value < QUESTIONS.length - 1) {
    quizIndex.value += 1;
  } else {
    finishQuiz();
  }
}

function isKeyCorrect(q: Question, key: OptionKey) {
  return q.correctKey === key;
}

function submitSingle(key: OptionKey) {
  const q = singleQ.value;
  if (!q) return;
  if (feedback.value) return;
  const ok = isKeyCorrect(q, key);
  answers.value.push({ questionId: q.id, type: "single", chosenKey: key, isCorrect: ok });
  feedback.value = ok
    ? { ok: true, text: "答对了！你把正确答案告诉了学生。" }
    : { ok: false, text: `答错了。正确答案是 ${q.correctKey}。` };
}

// 类型二：拖拽（小红花）
type DragState =
  | { active: false }
  | {
      active: true;
      startX: number;
      startY: number;
      x: number;
      y: number;
    };

const drag = ref<DragState>({ active: false });
const hoveredKidId = ref<string | null>(null);
const flowerPlacedKidId = ref<string | null>(null);

function getPointFromMouse(e: MouseEvent) {
  return { x: e.clientX, y: e.clientY };
}
function getPointFromTouch(e: TouchEvent) {
  const t = e.touches[0] || e.changedTouches[0];
  return { x: t.clientX, y: t.clientY };
}

function beginDragByPoint(p: { x: number; y: number }) {
  if (feedback.value) return;
  drag.value = {
    active: true,
    startX: p.x,
    startY: p.y,
    x: p.x,
    y: p.y
  };
}

function moveDragByPoint(p: { x: number; y: number }) {
  if (!drag.value.active) return;
  drag.value = { ...drag.value, x: p.x, y: p.y };

  // 命中检测：用 DOM rect 判断（无需关心缩放）
  const q = quizQuestion.value;
  if (!q || q.type !== "dragSingle") return;
  hoveredKidId.value = null;
  for (const kid of q.kids) {
    const el = document.getElementById(`kid-${kid.id}`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) {
      hoveredKidId.value = kid.id;
      break;
    }
  }
}

function endDrag() {
  if (!drag.value.active) return;
  const q = quizQuestion.value;
  drag.value = { active: false };
  if (!q || q.type !== "dragSingle") return;
  if (feedback.value) return;

  const chosen = hoveredKidId.value;
  hoveredKidId.value = null;
  if (!chosen) {
    // 回到起点
    flowerPlacedKidId.value = null;
    return;
  }
  flowerPlacedKidId.value = chosen;
  const ok = chosen === q.correctKidId;
  answers.value.push({ questionId: q.id, type: "dragSingle", chosenKidId: chosen, isCorrect: ok });
  feedback.value = ok
    ? { ok: true, text: "你把小红花发给了做对的小朋友！" }
    : { ok: false, text: "这位小朋友的答案不对，再看看谁做对了。" };

  if (!ok) {
    // 错误时让花回到底部，方便重试
    flowerPlacedKidId.value = null;
  }
}

function onFlowerMouseDown(e: MouseEvent) {
  e.preventDefault();
  beginDragByPoint(getPointFromMouse(e));
  window.addEventListener("mousemove", onWindowMouseMove, { passive: false });
  window.addEventListener("mouseup", onWindowMouseUp, { passive: false });
}
function onWindowMouseMove(e: MouseEvent) {
  e.preventDefault();
  moveDragByPoint(getPointFromMouse(e));
}
function onWindowMouseUp(e: MouseEvent) {
  e.preventDefault();
  window.removeEventListener("mousemove", onWindowMouseMove);
  window.removeEventListener("mouseup", onWindowMouseUp);
  endDrag();
}
function onFlowerTouchStart(e: TouchEvent) {
  e.preventDefault();
  beginDragByPoint(getPointFromTouch(e));
  window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
  window.addEventListener("touchend", onWindowTouchEnd, { passive: false });
  window.addEventListener("touchcancel", onWindowTouchEnd, { passive: false });
}
function onWindowTouchMove(e: TouchEvent) {
  e.preventDefault();
  moveDragByPoint(getPointFromTouch(e));
}
function onWindowTouchEnd(e: TouchEvent) {
  e.preventDefault();
  window.removeEventListener("touchmove", onWindowTouchMove);
  window.removeEventListener("touchend", onWindowTouchEnd);
  window.removeEventListener("touchcancel", onWindowTouchEnd);
  endDrag();
}

// 类型三：判断 + 单选
const judgeStep = ref<"judge" | "choose">("judge");
const judged = ref<null | boolean>(null);

const judgeStudentKey = computed(() => {
  const q = judgeQ.value;
  return q ? q.studentKey : "";
});
const judgeStudentText = computed(() => {
  const q = judgeQ.value;
  if (!q) return "";
  const hit = q.options.find((o) => o.key === q.studentKey);
  return hit ? hit.text : "";
});

function resetJudgeState() {
  judgeStep.value = "judge";
  judged.value = null;
}

function submitJudge(isRight: boolean) {
  const q = judgeQ.value;
  if (!q) return;
  if (feedback.value) return;
  if (judged.value !== null) return;

  const actuallyRight = q.studentKey === q.correctKey;
  judged.value = isRight;

  if (isRight && actuallyRight) {
    answers.value.push({
      questionId: q.id,
      type: "judgeThenSingle",
      judgedCorrect: true,
      isCorrect: true
    });
    feedback.value = { ok: true, text: "判断正确！这位小朋友做对了。" };
    return;
  }

  // 进入纠错单选
  judgeStep.value = "choose";
  feedback.value = { ok: false, text: "需要再选出正确答案教给他。" };
}

function submitJudgeChoice(key: OptionKey) {
  const q = judgeQ.value;
  if (!q) return;
  if (!feedback.value) return; // 必须先判断才进入
  if (judgeStep.value !== "choose") return;

  const ok = isKeyCorrect(q, key);
  answers.value.push({
    questionId: q.id,
    type: "judgeThenSingle",
    judgedCorrect: judged.value === (q.studentKey === q.correctKey),
    chosenKey: key,
    isCorrect: ok
  });
  feedback.value = ok
    ? { ok: true, text: "答对了！你把正确答案教给了学生。" }
    : { ok: false, text: `答错了。正确答案是 ${q.correctKey}。` };
}

const introIndex = ref(0);
const introVideo = computed(() => INTRO_VIDEOS[introIndex.value] || "");
const introAllDone = computed(() => INTRO_VIDEOS.length > 0 && introIndex.value >= INTRO_VIDEOS.length - 1);
const introCanEnter = computed(() => INTRO_VIDEOS.length === 0 || introAllDone.value);

function onIntroEnded() {
  if (INTRO_VIDEOS.length === 0) return;
  if (introIndex.value < INTRO_VIDEOS.length - 1) introIndex.value += 1;
}

const resultIndex = ref(0);
const resultVideo = computed(() => RESULT_VIDEOS[resultIndex.value] || "");
const resultTotal = computed(() => RESULT_VIDEOS.length);
const resultNeedUserPlay = ref(false);
const resultVideoEl = ref<HTMLVideoElement | null>(null);

async function tryPlayResultVideo() {
  const el = resultVideoEl.value;
  if (!el) return;
  try {
    const p = el.play();
    if (p && typeof (p as Promise<void>).then === "function") {
      await p;
    }
    resultNeedUserPlay.value = false;
  } catch {
    resultNeedUserPlay.value = true;
  }
}

function onResultEnded() {
  if (RESULT_VIDEOS.length === 0) {
    go("reward");
    return;
  }
  if (resultIndex.value < RESULT_VIDEOS.length - 1) {
    resultIndex.value += 1;
  } else {
    go("reward");
  }
}

const score = computed(() => answers.value.filter((a) => a.isCorrect).length);
const scoreText = computed(() => `${score.value}/${quizTotal.value}`);
const percent = computed(() => {
  if (quizTotal.value <= 0) return 0;
  return Math.round((score.value / quizTotal.value) * 100);
});

const rewardTier = computed(() => {
  const p = percent.value;
  if (p >= 90) return "S";
  if (p >= 75) return "A";
  if (p >= 60) return "B";
  return "C";
});

const rewardTitle = computed(() => {
  switch (rewardTier.value) {
    case "S":
      return "超强带班老师";
    case "A":
      return "靠谱带班老师";
    case "B":
      return "认真带班老师";
    default:
      return "继续加油";
  }
});

const rewardCopy = computed(() => {
  switch (rewardTier.value) {
    case "S":
      return "你观察得特别仔细，判断又快又准！同学们都很服你。";
    case "A":
      return "表现很棒！再多留意一下细节，你就能冲到满分。";
    case "B":
      return "你已经掌握了大部分题目，继续保持，错题再回顾一下就更稳了。";
    default:
      return "先别着急，慢慢来。再练一轮，你会更熟练。";
  }
});

const topRight = computed(() => {
  if (page.value !== "quiz") return "";
  return `第 ${Math.min(quizIndex.value + 1, quizTotal.value)}/${quizTotal.value} 题`;
});

function resetQuizState() {
  quizIndex.value = 0;
  answers.value = [];
  feedback.value = null;
  resetJudgeState();
  drag.value = { active: false };
  hoveredKidId.value = null;
  flowerPlacedKidId.value = null;
}

function resetAll() {
  introIndex.value = 0;
  resultIndex.value = 0;
  resultNeedUserPlay.value = false;
  resetQuizState();
}

watch(
  () => page.value,
  (p) => {
    if (p === "intro") {
      introIndex.value = 0;
      resetQuizState();
      resultIndex.value = 0;
      resultNeedUserPlay.value = false;
    }
    if (p === "quiz") {
      resetQuizState();
    }
    if (p === "resultVideo") {
      resultIndex.value = 0;
      resultNeedUserPlay.value = false;
      // 若未配置结果视频，则直接进入激励页
      if (RESULT_VIDEOS.length === 0) {
        setTimeout(() => go("reward"), 350);
      } else {
        // 进入后尝试自动播放（可能被策略阻止）
        setTimeout(() => {
          tryPlayResultVideo();
        }, 200);
      }
    }
  }
);

watch(
  () => resultIndex.value,
  () => {
    if (page.value !== "resultVideo") return;
    // 切换视频后尝试播放
    setTimeout(() => {
      tryPlayResultVideo();
    }, 120);
  }
);
</script>

<template>
  <div class="letterbox">
    <div class="stage" :style="stageStyle">
      <header v-if="page !== 'intro'" class="topbar">
        <div class="brand">
          <div class="brand__title">{{ APP_TITLE }}</div>
          <div class="brand__scene">{{ sceneTitle }}</div>
        </div>
        <div v-if="topRight" class="topbar__right">{{ topRight }}</div>
      </header>

      <main class="content" :class="{ 'content--intro': page === 'intro' }">
        <!-- Page1: 视频引导页 -->
        <section v-if="page === 'intro'" class="panel panel--intro">
          <div class="videoShell videoShell--intro">
            <div v-if="INTRO_VIDEOS.length === 0" class="videoEmpty">
              <div class="videoEmpty__title">请添加引导视频</div>
              <div class="videoEmpty__desc">
                把 mp4 放到 <code>public/videos/</code>，并在 <code>src/app/config.ts</code>
                里配置 <code>INTRO_VIDEOS</code>。
              </div>
            </div>

            <video
              v-else
              class="video"
              :src="introVideo"
              playsinline
              webkit-playsinline
              preload="auto"
              controls
              @ended="onIntroEnded"
            />
          </div>

          <div class="introCta">
            <button class="primaryBtn" :disabled="!introCanEnter" style="touch-action: none" @click="go('quiz')">
              我准备好了
            </button>
          </div>
        </section>

        <!-- Page2: 作答页（占位） -->
        <section v-else-if="page === 'quiz'" class="panel">
          <div v-if="!quizQuestion" class="videoEmpty">
            <div class="videoEmpty__title">暂无题目</div>
            <div class="videoEmpty__desc">请在 <code>src/app/config.ts</code> 配置 <code>QUESTIONS</code>。</div>
          </div>

          <template v-else>
            <div class="storyBar">
              <div class="storyBar__scene">
                <span class="pill">{{ quizQuestion.sceneName }}</span>
                <span class="storyBar__line">{{ quizQuestion.stem }}</span>
              </div>
              <div class="storyBar__score">当前得分：{{ scoreText }}</div>
            </div>

            <!-- 类型一：常规单选 -->
            <div v-if="singleQ" class="quizGrid">
              <div class="character">
                <div class="character__card">
                  <div class="character__name">学生</div>
                  <div class="bubble">老师，这道题我不会，答案是什么？</div>
                </div>
              </div>
              <div class="questionCard">
                <div class="questionCard__title">请选择正确答案</div>
                <div class="options">
                  <button
                    v-for="opt in singleQ.options"
                    :key="opt.key"
                    class="optionBtn"
                    style="touch-action: none"
                    :disabled="!!feedback"
                    @click="submitSingle(opt.key)"
                  >
                    <span class="optionKey">{{ opt.key }}</span>
                    <span class="optionText">{{ opt.text }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 类型二：拖拽单选 -->
            <div v-else-if="dragQ" class="dragStage">
              <div class="kidsGrid">
                <div
                  v-for="kid in dragQ.kids"
                  :id="`kid-${kid.id}`"
                  :key="kid.id"
                  class="kidCard"
                  :class="{ 'kidCard--hover': hoveredKidId === kid.id, 'kidCard--placed': flowerPlacedKidId === kid.id }"
                  style="touch-action: none"
                >
                  <div class="kidCard__name">{{ kid.name }}</div>
                  <div class="kidCard__answer">
                    我选：<span class="kidCard__key">{{ kid.optionKey }}</span>
                    <span class="kidCard__text">（{{ dragQ.options.find((o) => o.key === kid.optionKey)?.text }}）</span>
                  </div>
                  <div v-if="flowerPlacedKidId === kid.id" class="kidCard__flower">🌸</div>
                </div>
              </div>

              <div class="flowerBar">
                <div class="flowerHint">把小红花拖到做对的小朋友身上</div>

                <div
                  class="flower"
                  :class="{ 'flower--dragging': drag.active }"
                  :style="{
                    position: drag.active ? 'fixed' : 'absolute',
                    left: drag.active ? `${drag.x - 44}px` : '50%',
                    top: drag.active ? `${drag.y - 44}px` : 'auto',
                    bottom: drag.active ? 'auto' : '26px',
                    transform: drag.active ? 'none' : 'translateX(-50%)'
                  }"
                  style="touch-action: none"
                  @mousedown="onFlowerMouseDown"
                  @touchstart="onFlowerTouchStart"
                >
                  🌸
                </div>
              </div>
            </div>

            <!-- 类型三：判断 + 单选 -->
            <div v-else-if="judgeQ" class="quizGrid">
              <div class="character">
                <div class="character__card">
                  <div class="character__name">学生</div>
                  <div class="bubble">老师，我这样写对不对？</div>
                  <div class="studentAnswer">
                    我选的是：<b>{{ judgeStudentKey }}</b>
                    （{{ judgeStudentText }}）
                  </div>
                </div>
              </div>

              <div class="questionCard">
                <div class="questionCard__title">先判断对错</div>
                <div class="judgeRow">
                  <button
                    class="judgeBtn"
                    style="touch-action: none"
                    :disabled="judged !== null || !!feedback"
                    @click="submitJudge(true)"
                  >
                    对
                  </button>
                  <button
                    class="judgeBtn judgeBtn--no"
                    style="touch-action: none"
                    :disabled="judged !== null || !!feedback"
                    @click="submitJudge(false)"
                  >
                    错
                  </button>
                </div>

                <div v-if="judgeStep === 'choose'" class="chooseArea">
                  <div class="questionCard__subtitle">再选出正确答案</div>
                  <div class="options">
                    <button
                      v-for="opt in (judgeQ ? judgeQ.options : [])"
                      :key="opt.key"
                      class="optionBtn"
                      style="touch-action: none"
                      :disabled="feedback?.ok === true"
                      @click="submitJudgeChoice(opt.key)"
                    >
                      <span class="optionKey">{{ opt.key }}</span>
                      <span class="optionText">{{ opt.text }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="videoEmpty">
              <div class="videoEmpty__title">题型未识别</div>
              <div class="videoEmpty__desc">请检查 <code>QUESTIONS</code> 配置。</div>
            </div>

            <footer class="bottombar">
              <div class="hint" :class="{ hintOk: feedback?.ok, hintBad: feedback && !feedback.ok }">
                {{ feedback ? feedback.text : "作答后会出现反馈，点击继续进入下一题" }}
              </div>
              <button
                v-if="canContinue"
                class="primaryBtn"
                style="touch-action: none"
                @click="
                  () => {
                    resetJudgeState();
                    nextQuestion();
                  }
                "
              >
                继续
              </button>
              <button v-else class="secondaryBtn" style="touch-action: none" @click="go('intro')">退出</button>
            </footer>
          </template>
        </section>

        <!-- Page3: 结果引导视频（骨架） -->
        <section v-else-if="page === 'resultVideo'" class="panel">
          <div class="videoShell videoShell--result">
            <div v-if="RESULT_VIDEOS.length === 0" class="videoEmpty">
              <div class="videoEmpty__title">未配置结果引导视频</div>
              <div class="videoEmpty__desc">
                在 <code>src/app/config.ts</code> 配置 <code>RESULT_VIDEOS</code> 后可顺序播放，播完自动进入激励页。
              </div>
            </div>

            <video
              v-else
              ref="resultVideoEl"
              class="video"
              :src="resultVideo"
              playsinline
              webkit-playsinline
              preload="auto"
              controls="false"
              @ended="onResultEnded"
            />

            <div v-if="RESULT_VIDEOS.length > 0" class="resultOverlay">
              <div class="resultOverlay__meta">
                <div class="resultOverlay__progress">
                  结果引导视频 {{ Math.min(resultIndex + 1, resultTotal) }}/{{ resultTotal }}
                </div>
                <div class="resultOverlay__hint">视频播完将自动进入激励页</div>
              </div>

              <button
                v-if="resultNeedUserPlay"
                class="primaryBtn"
                style="touch-action: none"
                @click="tryPlayResultVideo"
              >
                点击播放
              </button>
            </div>
          </div>

          <footer class="bottombar">
            <div class="hint">如无法自动播放，请点击画面中的「点击播放」。</div>
            <button class="secondaryBtn" style="touch-action: none" @click="go('reward')">跳过视频</button>
          </footer>
        </section>

        <!-- Page4: 激励页 -->
        <section v-else class="panel reward">
          <div class="rewardCard">
            <div class="rewardTop">
              <div class="rewardBadge">
                <div class="rewardBadge__tier">{{ rewardTier }}</div>
                <div class="rewardBadge__label">评价</div>
              </div>

              <div class="rewardText">
                <div class="rewardTitle">{{ rewardTitle }}</div>
                <div class="rewardCopy">{{ rewardCopy }}</div>
              </div>
            </div>

            <div class="rewardStats">
              <div class="stat">
                <div class="stat__label">正确题数</div>
                <div class="stat__value">{{ score }}/{{ quizTotal }}</div>
              </div>
              <div class="stat">
                <div class="stat__label">正确率</div>
                <div class="stat__value">{{ percent }}%</div>
              </div>
              <div class="stat">
                <div class="stat__label">你的称号</div>
                <div class="stat__value">{{ rewardTitle }}</div>
              </div>
            </div>

            <div class="rewardActions">
              <button
                class="secondaryBtn"
                style="touch-action: none"
                @click="
                  () => {
                    resetAll();
                    go('intro');
                  }
                "
              >
                再来一次
              </button>
              <button
                class="primaryBtn"
                style="touch-action: none"
                @click="
                  () => {
                    resetAll();
                    go('intro');
                  }
                "
              >
                完成
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.letterbox {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
}

.stage {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center;
  background: #0b1220;
  color: #eef2ff;
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif;
}

.topbar {
  height: 110px;
  padding: 34px 60px 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.brand__title {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.brand__scene {
  margin-top: 10px;
  font-size: 22px;
  color: rgba(238, 242, 255, 0.8);
}

.topbar__right {
  margin-top: 10px;
  font-size: 22px;
  color: rgba(238, 242, 255, 0.8);
}

.content {
  padding: 0 60px 60px;
  position: relative;
}

.content--intro {
  padding: 0;
  height: 1080px;
}

.panel {
  height: 910px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.panel--intro {
  gap: 0;
  height: 1080px;
  position: relative;
}

.videoShell {
  flex: 1;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.videoShell--intro {
  border-radius: 0;
  border: 0;
  background: #000;
  position: absolute;
  inset: 0;
}

.videoShell--intro .video {
  object-fit: cover;
}

.introCta {
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 20;
}

.introCta .primaryBtn {
  padding: 20px 34px;
  font-size: 24px;
  border-radius: 16px;
}

.videoShell--result .video {
  pointer-events: none;
}

.resultOverlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 26px;
  pointer-events: none;
}

.resultOverlay__meta {
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resultOverlay__progress {
  font-size: 20px;
  color: rgba(238, 242, 255, 0.85);
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: inline-flex;
  width: fit-content;
}

.resultOverlay__hint {
  font-size: 18px;
  color: rgba(238, 242, 255, 0.7);
}

.resultOverlay .primaryBtn {
  pointer-events: auto;
}

.videoEmpty {
  text-align: center;
  padding: 40px;
  max-width: 960px;
}

.videoEmpty__title {
  font-size: 34px;
  font-weight: 700;
}

.videoEmpty__desc {
  margin-top: 14px;
  font-size: 20px;
  color: rgba(238, 242, 255, 0.75);
  line-height: 1.6;
}

.bottombar {
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.hint {
  font-size: 20px;
  color: rgba(238, 242, 255, 0.8);
  max-width: 1250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hintOk {
  color: rgba(134, 239, 172, 0.95);
}

.hintBad {
  color: rgba(251, 113, 133, 0.95);
}

.primaryBtn,
.secondaryBtn {
  border: 0;
  padding: 18px 26px;
  border-radius: 14px;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}

.primaryBtn {
  background: #7c3aed;
  color: #fff;
}

.primaryBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.secondaryBtn {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(238, 242, 255, 0.92);
}

.placeholder {
  justify-content: center;
  align-items: center;
  text-align: center;
}

.placeholder__title {
  font-size: 42px;
  font-weight: 800;
}

.placeholder__desc {
  margin-top: 16px;
  font-size: 22px;
  color: rgba(238, 242, 255, 0.75);
}

.placeholder__actions {
  margin-top: 26px;
  display: flex;
  gap: 16px;
}

.reward {
  justify-content: center;
  align-items: center;
}

.rewardCard {
  width: 100%;
  height: 100%;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 34px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.rewardTop {
  display: flex;
  gap: 24px;
  align-items: center;
}

.rewardBadge {
  width: 160px;
  height: 160px;
  border-radius: 28px;
  background: rgba(124, 58, 237, 0.22);
  border: 1px solid rgba(124, 58, 237, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.rewardBadge__tier {
  font-size: 74px;
  font-weight: 1000;
  line-height: 1;
}

.rewardBadge__label {
  margin-top: 10px;
  font-size: 18px;
  color: rgba(238, 242, 255, 0.75);
}

.rewardText {
  flex: 1;
  min-width: 0;
}

.rewardTitle {
  font-size: 52px;
  font-weight: 1000;
  letter-spacing: 0.5px;
}

.rewardCopy {
  margin-top: 16px;
  font-size: 24px;
  color: rgba(238, 242, 255, 0.8);
  line-height: 1.55;
  max-width: 1400px;
}

.rewardStats {
  display: flex;
  gap: 18px;
}

.stat {
  flex: 1;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 18px 18px;
}

.stat__label {
  font-size: 18px;
  color: rgba(238, 242, 255, 0.65);
}

.stat__value {
  margin-top: 10px;
  font-size: 34px;
  font-weight: 950;
  color: rgba(238, 242, 255, 0.92);
}

.rewardActions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.storyBar {
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.storyBar__scene {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 1420px;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(124, 58, 237, 0.25);
  border: 1px solid rgba(124, 58, 237, 0.55);
  font-size: 18px;
  font-weight: 800;
}

.storyBar__line {
  font-size: 22px;
  color: rgba(238, 242, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.storyBar__score {
  font-size: 20px;
  color: rgba(238, 242, 255, 0.75);
}

.quizGrid {
  flex: 1;
  display: flex;
  gap: 22px;
}

.character {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character__card {
  width: 100%;
  height: 100%;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 26px;
}

.character__name {
  font-size: 22px;
  font-weight: 800;
  color: rgba(238, 242, 255, 0.85);
}

.bubble {
  margin-top: 18px;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.25;
}

.studentAnswer {
  margin-top: 22px;
  font-size: 22px;
  color: rgba(238, 242, 255, 0.8);
}

.questionCard {
  width: 720px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 26px;
  display: flex;
  flex-direction: column;
}

.questionCard__title {
  font-size: 26px;
  font-weight: 900;
}

.questionCard__subtitle {
  margin-top: 18px;
  font-size: 20px;
  color: rgba(238, 242, 255, 0.75);
}

.options {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
}

.optionBtn {
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.18);
  color: rgba(238, 242, 255, 0.92);
  padding: 16px 16px;
  border-radius: 14px;
  margin-top: 12px;
  cursor: pointer;
  user-select: none;
}

.optionBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.optionKey {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(124, 58, 237, 0.5);
}

.optionText {
  font-size: 22px;
}

.dragStage {
  position: relative;
  flex: 1;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 26px;
  overflow: hidden;
}

.kidsGrid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.kidCard {
  width: 880px;
  height: 300px;
  margin-bottom: 22px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.18);
  padding: 22px;
  position: relative;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.kidCard--hover {
  border-color: rgba(124, 58, 237, 0.9);
  transform: translateY(-2px);
}

.kidCard--placed {
  border-color: rgba(134, 239, 172, 0.9);
}

.kidCard__name {
  font-size: 28px;
  font-weight: 900;
}

.kidCard__answer {
  margin-top: 16px;
  font-size: 24px;
  color: rgba(238, 242, 255, 0.85);
}

.kidCard__key {
  font-weight: 900;
  color: rgba(134, 239, 172, 0.95);
}

.kidCard__text {
  margin-left: 10px;
  color: rgba(238, 242, 255, 0.7);
}

.kidCard__flower {
  position: absolute;
  right: 18px;
  top: 16px;
  font-size: 44px;
}

.flowerBar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 220px;
  background: linear-gradient(180deg, rgba(11, 18, 32, 0), rgba(11, 18, 32, 0.8));
}

.flowerHint {
  position: absolute;
  left: 26px;
  bottom: 26px;
  font-size: 22px;
  color: rgba(238, 242, 255, 0.8);
}

.flower {
  position: absolute;
  width: 88px;
  height: 88px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  cursor: grab;
  z-index: 50;
  user-select: none;
}

.flower--dragging {
  cursor: grabbing;
  z-index: 999;
  transform: scale(1.05);
}

.judgeRow {
  margin-top: 18px;
  display: flex;
  gap: 14px;
}

.judgeBtn {
  flex: 1;
  border: 0;
  padding: 18px 20px;
  border-radius: 14px;
  font-size: 24px;
  font-weight: 900;
  cursor: pointer;
  user-select: none;
  background: rgba(134, 239, 172, 0.18);
  border: 1px solid rgba(134, 239, 172, 0.55);
  color: rgba(238, 242, 255, 0.92);
}

.judgeBtn--no {
  background: rgba(251, 113, 133, 0.18);
  border-color: rgba(251, 113, 133, 0.55);
}

.chooseArea {
  margin-top: 18px;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  font-size: 0.95em;
}
</style>

