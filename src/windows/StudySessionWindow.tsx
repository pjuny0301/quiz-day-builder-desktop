import { BackActionButton } from "@components/BackActionButton";
import { HtmlView } from "@components/HtmlView";
import { WindowShell } from "@components/WindowShell";
import { useStudySessionController } from "@features/study/session";

// Render the study-session screen while delegating session transitions to the feature controller.
export function StudySessionWindow() {
  const {
    deck,
    isLoading,
    loadError,
    session,
    currentCard,
    currentMode,
    typedAnswer,
    feedback,
    selectedChoiceIndex,
    correctChoiceIndex,
    multipleChoiceOptions,
    wrongReviewOpen,
    wrongReviewCards,
    wrongReviewCount,
    answerInputRef,
    isFinished,
    scopedCards,
    progressPercent,
    accuracy,
    correctRatio,
    wrongRatio,
    answeredCount,
    showOutcomeBreakdown,
    questionIsLong,
    questionHasImage,
    scopeLabel,
    modeLabel,
    progressLabel,
    setTypedAnswer,
    setWrongReviewOpen,
    goBackFromSession,
    restartEntireSession,
    restartWrongOnlySession,
    submitTypedAnswer,
    submitChoiceByIndex,
  } = useStudySessionController();

  if (isLoading && !deck) {
    return (
      <WindowShell role="study-session" eyebrow="" title="" description="">
        <div className="empty-state">학습 세션을 준비하는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell role="study-session" eyebrow="" title="" description="">
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck) {
    return (
      <WindowShell role="study-session" eyebrow="" title="" description="">
        <div className="empty-state">요청한 덱 또는 세션 정보가 없습니다.</div>
      </WindowShell>
    );
  }

  if (scopedCards.length === 0) {
    return (
      <WindowShell role="study-session" eyebrow="" title="" description="">
        <section className="study-session-screen">
          <header className="study-topbar study-topbar--session">
            <BackActionButton actionId="study-session.back-to-launcher" onClick={() => void goBackFromSession()} />
          </header>
          <div className="empty-state">선택한 범위에 학습할 카드가 없습니다.</div>
        </section>
      </WindowShell>
    );
  }

  if (!session) {
    return (
      <WindowShell role="study-session" eyebrow="" title="" description="">
        <div className="empty-state">학습 세션을 준비하는 중입니다.</div>
      </WindowShell>
    );
  }

  return (
    <WindowShell role="study-session" eyebrow="" title="" description="">
      <section className="study-session-screen">
        <header className="study-topbar study-topbar--session">
          <BackActionButton actionId="study-session.back-to-launcher" onClick={() => void goBackFromSession()} />
          <div className="study-topbar__center">
            <strong>{scopeLabel}</strong>
            <span>{modeLabel}</span>
          </div>
          <div className="study-topbar__meta">{progressLabel}</div>
        </header>

        {isFinished ? (
          <section className="study-complete-screen">
            <div className="study-complete-banner">
              <h2>학습 완료</h2>
              <p>{scopeLabel} 학습을 마쳤습니다.</p>
            </div>

            <div className="study-complete-metrics">
              <article className="study-complete-metric">
                <strong>{session.correct}</strong>
                <span>맞은 개수</span>
              </article>
              <article className="study-complete-metric">
                <strong>{session.wrong}</strong>
                <span>틀린 개수</span>
              </article>
              <article className="study-complete-metric">
                <strong>{accuracy}%</strong>
                <span>정답률</span>
              </article>
            </div>

            <div className="study-complete-actions">
              <button
                className="button button--secondary button--large study-complete-button"
                data-action-id="study-session.restart-wrong"
                onClick={() => restartWrongOnlySession()}
                disabled={wrongReviewCount === 0}
              >
                {wrongReviewCount > 0 ? `오답만 학습 (${wrongReviewCount})` : "오답 없음"}
                <span className="button__hint">1</span>
              </button>
              <button
                className="button button--primary button--large study-complete-button"
                data-action-id="study-session.restart-all"
                onClick={() => restartEntireSession()}
              >
                전체 다시 학습
                <span className="button__hint">2</span>
              </button>
            </div>

            {wrongReviewCount > 0 ? (
              <section className="study-wrong-review">
                <button className="study-wrong-review__toggle" data-action-id="study-session.toggle-wrong-review" onClick={() => setWrongReviewOpen((previous) => !previous)}>
                  <span>{wrongReviewOpen ? "틀린 문제 숨기기" : `틀린 문제 보기 (${wrongReviewCount})`}</span>
                  <strong>{wrongReviewOpen ? "-" : "+"}</strong>
                </button>

                {wrongReviewOpen ? (
                  <div className="study-wrong-review__list">
                    {wrongReviewCards.map((card, index) => (
                      <article key={card.id} className="study-wrong-review__card">
                        <p className="study-wrong-review__index">틀린 문제 {index + 1}</p>
                        <div className="study-wrong-review__surface">
                          <p className="match-card__eyebrow">문제</p>
                          <HtmlView html={card.question_html} className="html-view" />
                        </div>
                        <div className="study-wrong-review__surface study-wrong-review__surface--answer">
                          <p className="match-card__eyebrow">정답</p>
                          <HtmlView html={card.answer_html} className="html-view" />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </section>
        ) : currentCard ? (
          <>
            <section className="study-question-stage study-question-stage--focus">
              <div className="study-question-card">
                <div className="study-question-card__topline">
                  <span className="study-question-card__mode">{modeLabel}</span>
                  <span className="study-question-card__count">{session.index + 1}/{session.cards.length}</span>
                </div>
                <div className="study-question-card__body">
                  <HtmlView
                    html={currentCard.question_html}
                    className={`html-view html-view--study-question${questionIsLong ? " html-view--study-question-long" : ""}`}
                  />
                </div>
                <div className="study-question-card__footer">
                  <div className="study-question-card__summary">
                    <span>맞음 {session.correct}</span>
                    <span>틀림 {session.wrong}</span>
                  </div>
                  <div className="progress-track progress-track--study">
                    <div className="progress-track__fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  {showOutcomeBreakdown ? (
                    <div className="study-question-card__ratio" aria-hidden="true">
                      <div className="study-question-card__ratio--correct" style={{ width: `${correctRatio}%` }} />
                      <div className="study-question-card__ratio--wrong" style={{ width: `${wrongRatio}%` }} />
                    </div>
                  ) : null}
                </div>
                {feedback ? (
                  <div className={`study-question-card__mark study-question-card__mark--${feedback.kind}${questionHasImage ? " study-question-card__mark--image" : ""}`}>
                    <strong>{feedback.kind === "correct" ? "O" : "X"}</strong>
                  </div>
                ) : null}
              </div>
              {feedback ? (
                <div className="study-answer-reveal">
                  <HtmlView html={feedback.answerHtml} className="html-view html-view--study-answer-reveal" />
                </div>
              ) : null}
            </section>

            <section className="study-answer-stage study-answer-stage--focus">
              {currentMode === "Short Answer" ? (
                <div className="study-answer-stack">
                  <input
                    ref={answerInputRef}
                    className="study-answer-input"
                    value={typedAnswer}
                    onChange={(event) => setTypedAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        submitTypedAnswer();
                      }
                    }}
                    placeholder="정답 입력"
                    disabled={Boolean(feedback)}
                  />
                  <button
                    className="button button--primary button--large study-answer-submit"
                    data-action-id="study-session.submit-answer"
                    disabled={Boolean(feedback)}
                    onClick={() => submitTypedAnswer()}
                  >
                    제출
                    <span className="button__hint">Enter</span>
                  </button>
                </div>
              ) : (
                <div className="study-choice-stack">
                  {multipleChoiceOptions.map((option, index) => {
                    const isSelected = selectedChoiceIndex === index;
                    const isCorrectChoice = correctChoiceIndex === index;
                    const choiceClasses = [
                      "choice-button",
                      "choice-button--study",
                      isSelected && !isCorrectChoice ? "choice-button--selected" : "",
                      isCorrectChoice ? "choice-button--correct" : "",
                    ].filter(Boolean).join(" ");

                    return (
                      <button
                        key={`${option}-${index}`}
                        className={choiceClasses}
                        data-action-id={`study-session.choice.${index + 1}`}
                        disabled={Boolean(feedback)}
                        onClick={() => submitChoiceByIndex(index)}
                      >
                        <span className="choice-button__shortcut">{index + 1}</span>
                        <span className="choice-button__text">{option || "[이미지 정답]"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="empty-state">현재 표시할 카드가 없습니다.</div>
        )}
      </section>
    </WindowShell>
  );
}
