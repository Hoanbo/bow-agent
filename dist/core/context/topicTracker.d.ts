export interface TopicState {
    activeTopic: string;
    previousTopic?: string;
    topicConfidence: number;
    topicChanged: boolean;
    lastRelevantTurn?: string;
}
export declare class TopicTracker {
    /**
     * Detects active topic and confidence from text.
     */
    detectTopic(text: string): {
        activeTopic: string;
        topicConfidence: number;
    };
    /**
     * Infers candidate topic and score from text.
     */
    inferTopic(text: string): {
        topic: string;
        confidence: number;
    };
    /**
     * Updates existing topic state based on the latest conversational turn.
     */
    updateTopic(currentState: TopicState | undefined, currentText: string, turnId?: string): TopicState;
}
export declare const globalTopicTracker: TopicTracker;
