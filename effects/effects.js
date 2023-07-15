const effectsCTX = new AudioContext();
const effectsFileReader = new FileReader();

async function playWithEffects(blob) {
    return new Promise((resolve, reject) => {  
        effectsFileReader.onloadend = async() => {
            const arrayBuffer = effectsFileReader.result;
        
            const audioBuffer = await effectsCTX.decodeAudioData(arrayBuffer);
    
            const synthBuffer = await synthTransformer(audioBuffer, { modulatorGain: 4, noise: 0.07, sample: 0.0, synth: 0.5, synthDetune: 0 });
            var audioBufferSource = effectsCTX.createBufferSource();
            audioBufferSource.buffer = synthBuffer;
            audioBufferSource.connect(effectsCTX.destination);
            audioBufferSource.start(0);
            resolve(true);
        };
    
        effectsFileReader.onerror = () => {
            reject(effectsFileReader.error);
        };
    
        effectsFileReader.readAsArrayBuffer(blob);
    });
}