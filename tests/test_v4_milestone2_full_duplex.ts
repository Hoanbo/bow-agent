// tests/test_v4_milestone2_full_duplex.ts
// BOW AGENT V4.0 MILESTONE 2 — FULL-DUPLEX WEBRTC STREAMING & REALTIME BARGE-IN TEST SUITE

import { WebSocket } from 'ws';
import {
  fullDuplexAudioHub,
  robotChannelAdapter,
  type RobotCommandPayload,
} from '../src/index.js';
import { BowCentralAgentServer } from '../src/server.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runFullDuplexSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING V4.0 MILESTONE 2: FULL-DUPLEX AUDIO & BARGE-IN TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: CONVERSATIONAL STATE MACHINE
  // --------------------------------------------------------------------------
  console.log('🔄 SECTION 1: Full-Duplex Conversational State Machine');

  const testSessionId = 'session_duplex_01';
  const session = fullDuplexAudioHub.getOrCreateSession(testSessionId);
  assert(session.state === 'IDLE', 'New session initializes in IDLE state');

  fullDuplexAudioHub.setState(testSessionId, 'LISTENING');
  assert(fullDuplexAudioHub.getState(testSessionId) === 'LISTENING', 'State transitioned to LISTENING');

  fullDuplexAudioHub.startRobotSpeaking(testSessionId, 'playback_speech_001');
  assert(fullDuplexAudioHub.getState(testSessionId) === 'SPEAKING', 'State transitioned to SPEAKING during robot playback');
  assert(session.currentPlaybackId === 'playback_speech_001', 'Playback ID tracked accurately');

  // --------------------------------------------------------------------------
  // SECTION 2: REALTIME BARGE-IN DETECTION (< 80ms INTERRUPT)
  // --------------------------------------------------------------------------
  console.log('\n⚡ SECTION 2: Realtime Barge-in Detection (< 80ms Interrupt)');

  // Ensure robot is speaking
  fullDuplexAudioHub.startRobotSpeaking(testSessionId, 'playback_speech_long_report');

  const bargeInState = { fired: false, latencyMs: 0 };
  const onBargeInListener = (event: any) => {
    bargeInState.fired = true;
    bargeInState.latencyMs = event.detectionLatencyMs;
  };
  fullDuplexAudioHub.once('bargeIn', onBargeInListener);

  // User speaks over the robot!
  const userVoiceChunk = 'user_says_stop_and_open_new_tab_immediately_loud_speech';
  const interruptResult = fullDuplexAudioHub.processIncomingAudioChunk(testSessionId, userVoiceChunk);

  assert(interruptResult.isInterrupted === true, 'Barge-in successfully detected when user interrupts');
  assert(bargeInState.fired === true, 'bargeIn event fired on FullDuplexAudioHub');
  assert(interruptResult.latencyMs < 80, 'Barge-in detection latency is < 80ms (Actual: ' + interruptResult.latencyMs + 'ms)');
  assert(fullDuplexAudioHub.getState(testSessionId) === 'LISTENING', 'State automatically switched to LISTENING for new user command');

  // --------------------------------------------------------------------------
  // SECTION 3: ROBOT ADAPTER INTERRUPT DISPATCH & HARDWARE DIRECTIVES
  // --------------------------------------------------------------------------
  console.log('\n🤖 SECTION 3: Robot Channel Adapter Interrupt Event Dispatch');

  const robotEventState = {
    interruptCommand: undefined as RobotCommandPayload | undefined,
  };
  const unregisterListener = robotChannelAdapter.registerListener((cmd) => {
    if (cmd.type === 'robot.interrupt') {
      robotEventState.interruptCommand = cmd;
    }
  });

  // Put robot in speaking state again
  fullDuplexAudioHub.startRobotSpeaking('robot_session_hardware');

  // Stream incoming audio from user
  robotChannelAdapter.handleStreamingAudioChunk(
    'user_speaks_louder_to_interrupt_robot_speaking',
    'robot_session_hardware'
  );

  assert(Boolean(robotEventState.interruptCommand), 'Robot adapter received robot.interrupt command');
  assert(robotEventState.interruptCommand?.type === 'robot.interrupt', 'Command type is robot.interrupt');
  assert(robotEventState.interruptCommand?.interrupt?.action === 'stop_playback', 'Action specifies stop_playback for DAC/speaker');
  assert(robotEventState.interruptCommand?.emotion === 'listening', 'Robot OLED emotion switched to listening');
  assert(robotEventState.interruptCommand?.servo?.tiltAngle === 10, 'Robot servo tilted up by 10 degrees to look at Boss');


  unregisterListener();

  // --------------------------------------------------------------------------
  // SECTION 4: PLAYBACK QUEUE ABORT & RESILIENCE
  // --------------------------------------------------------------------------
  console.log('\n🛑 SECTION 4: Playback Queue Abort & Resilience');

  fullDuplexAudioHub.startRobotSpeaking('abort_session');
  const abortRes = fullDuplexAudioHub.abortPlayback('abort_session');
  assert(abortRes.aborted === true, 'abortPlayback successfully aborted active speech');
  assert(fullDuplexAudioHub.getState('abort_session') === 'LISTENING', 'State returned to LISTENING');

  // --------------------------------------------------------------------------
  // SECTION 5: WEBSOCKET GATEWAY STREAMING (/ws/audio-stream)
  // --------------------------------------------------------------------------
  console.log('\n🌐 SECTION 5: WebSocket Audio Stream Gateway Integration');

  const testServerPort = 4088;
  const server = new BowCentralAgentServer({ port: testServerPort });
  await server.start();

  try {
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/ws/audio-stream`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
    assert(ws.readyState === WebSocket.OPEN, 'WebSocket connected to /ws/audio-stream');

    // Put robot in speaking state
    fullDuplexAudioHub.startRobotSpeaking('ws_stream_session');

    // Listen for server interrupt response
    const receivedInterrupt: any = await new Promise((resolve) => {
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'robot.interrupt') {
            resolve(parsed);
          }
        } catch {}
      });

      // Send audio chunk that interrupts the robot
      ws.send(JSON.stringify({
        type: 'audio_chunk',
        sessionId: 'ws_stream_session',
        chunk: 'incoming_microphone_voice_stream_loud_speech',
      }));
    });

    assert(receivedInterrupt.type === 'robot.interrupt', 'WebSocket received robot.interrupt message');
    assert(receivedInterrupt.action === 'stop_playback', 'Interrupt action is stop_playback');
    assert(receivedInterrupt.reason === 'barge_in', 'Interrupt reason is barge_in');

    ws.close();
  } finally {
    await server.stop();
  }

  // --------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 V4.0 MILESTONE 2 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🌟 ALL SECTIONS (1-5) PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runFullDuplexSuite().catch((err) => {
  console.error('Fatal error running full duplex suite:', err);
  process.exit(1);
});
