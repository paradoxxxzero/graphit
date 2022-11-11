class RecordingProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0]
    if (input.length) {
      // Keep only mono data for now
      this.port.postMessage(input[0])
    }
    return true
  }
}

registerProcessor('recording-processor', RecordingProcessor)
