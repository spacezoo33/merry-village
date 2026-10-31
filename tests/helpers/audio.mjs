import assert from "node:assert/strict";
export const wait = () => new Promise((r) => setTimeout(r, 0));
const parameter = () => ({
  value: 0,
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
  setTargetAtTime() {},
});
export class FakeContext {
  currentTime = 0;
  state = "suspended";
  destination = {};
  oscillators = [];
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  createGain() {
    return { gain: parameter(), connect() {}, disconnect() {} };
  }
  createDynamicsCompressor() {
    return {
      threshold: parameter(),
      knee: parameter(),
      ratio: parameter(),
      attack: parameter(),
      release: parameter(),
      connect() {},
      disconnect() {},
    };
  }
  createAnalyser() {
    return {
      fftSize: 2048,
      connect() {},
      disconnect() {},
      getFloatTimeDomainData(data) {
        data.fill(0);
      },
    };
  }
  createBiquadFilter() {
    return { frequency: parameter(), connect() {}, disconnect() {} };
  }
  createBuffer(channels, length, rate) {
    assert.equal(channels, 1);
    const data = new Float32Array(length);
    return {
      duration: length / rate,
      getChannelData: () => data,
      copyToChannel: (source) => data.set(source),
    };
  }
  sources = [];
  createBufferSource() {
    const source = {
      connect() {},
      disconnect() {},
      start() {},
      stop() {
        this.onended?.();
      },
    };
    this.sources.push(source);
    return source;
  }
  createOscillator() {
    const node = {
      frequency: parameter(),
      connect() {},
      disconnect() {},
      start(at) {
        this.startAt = at;
      },
      stop(at) {
        this.stopAt = at;
      },
    };
    this.oscillators.push(node);
    return node;
  }
}
