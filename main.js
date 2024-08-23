/*
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

let processWorker = null;
let tileNum = 6;

const sp = document.querySelectorAll("[id^='sp']");

const drawWorkers = [];
const encoderWorkers = [];
const decoderWorkers = [];

const encoderConfig = {
    codec: "avc1.42001e", // Baseline = 66, level 30 (see: https://en.wikipedia.org/wiki/Advanced_Video_Coding)
    width: 800,
    height: 500,
    bitrate: 1_500_000, // 1 Mbps
    framerate: 30,
    hardwareAcceleration: "prefer-software",
    latencyMode: "realtime", // Sends 1 chunk per frame
};

async function initializeVideo() {
    const origin = document.getElementById("origin");

    await navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
            console.debug(stream);
            origin.srcObject = stream;
            origin.play();

            const videoTrack = stream.getVideoTracks()[0];
            const trackProcessor = new MediaStreamTrackProcessor({
                track: videoTrack,
            });
            const vFrameStream = trackProcessor.readable;
            processWorker.postMessage(
                {
                    type: "stream",
                    stream: vFrameStream,
                },
                [vFrameStream]
            );
        });
}

function drawTile(e) {
    let type = e.data.type;
    if (type === "tile") {
        const tile = e.data.tile;
        const loc = e.data.loc;

        drawWorkers[loc].postMessage({ type, tile }, [tile]);
    }
}

function createDrawWorkers() {
    for (let i = 0; i < tileNum * tileNum; i++) {
        sp[i].style.width = `${95 / tileNum - 1}%`;
        sp[i].style.height = `${95 / tileNum - 1}%`;

        const drawWorker = new Worker("offscreen.js", { type: "module" });
        const offscreen = sp[i].transferControlToOffscreen();
        drawWorker.postMessage(
            {
                type: "init",
                canvas: offscreen,
                drawWidth: sp[i].width,
                drawHeight: sp[i].height,
            },
            [offscreen]
        );
        drawWorkers.push(drawWorker);
    }
}

function encodeTile(e) {
    let type = e.data.type;
    if (type === "tile") {
        const tile = e.data.tile;
        const loc = e.data.loc;

        const id = loc.y * tileNum + loc.x;
        encoderWorkers[id].postMessage({ type, tile }, [tile]);
    }
}

function createEncoders() {
    for (let i = 0; i < tileNum * tileNum; i++) {
        const encoder = new Worker("encoder.js", { type: "module" });
        encoder.postMessage({
            type: "init",
            loc: i,
            encoderConfig,
        });
        encoder.addEventListener("message", function (e) {
            const loc = e.data.loc;
            if (loc < decoderWorkers.length) {
                decoderWorkers[loc].postMessage(e.data);
            }
        });
        encoderWorkers.push(encoder);
    }
}

function createDecoders() {
    for (let i = 0; i < tileNum * tileNum; i++) {
        const decoder = new Worker("decoder.js", { type: "module" });
        decoder.postMessage({
            type: "init",
            loc: i,
        });
        decoder.addEventListener("message", function (e) {
            drawTile(e);
        });
        decoderWorkers.push(decoder);
    }
}

window.addEventListener("load", (event) => {
    processWorker = new Worker("processWorker.js", { type: "module" });
    processWorker.postMessage({ type: "init", tileNum });
    processWorker.addEventListener("message", function (e) {
        encodeTile(e);
    });

    createDrawWorkers();
    createEncoders();
    createDecoders();

    initializeVideo();
});
