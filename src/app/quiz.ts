export type SceneType = "single" | "dragSingle" | "judgeThenSingle";

export type OptionKey = "A" | "B" | "C" | "D";

export type BaseQuestion = {
  id: string;
  type: SceneType;
  sceneName: "我不会" | "看看谁对" | "我对不对";
  stem: string;
  options: Array<{ key: OptionKey; text: string }>;
  correctKey: OptionKey;
};

export type SingleQuestion = BaseQuestion & {
  type: "single";
};

export type DragKid = {
  id: string;
  name: string;
  optionKey: OptionKey;
};

export type DragSingleQuestion = BaseQuestion & {
  type: "dragSingle";
  kids: DragKid[];
  correctKidId: string;
};

export type JudgeThenSingleQuestion = BaseQuestion & {
  type: "judgeThenSingle";
  studentKey: OptionKey;
};

export type Question = SingleQuestion | DragSingleQuestion | JudgeThenSingleQuestion;

export type AnswerRecord =
  | {
      questionId: string;
      type: "single";
      chosenKey: OptionKey;
      isCorrect: boolean;
    }
  | {
      questionId: string;
      type: "dragSingle";
      chosenKidId: string;
      isCorrect: boolean;
    }
  | {
      questionId: string;
      type: "judgeThenSingle";
      judgedCorrect: boolean;
      // 若需要第二步才会有 chosenKey
      chosenKey?: OptionKey;
      isCorrect: boolean;
    };

