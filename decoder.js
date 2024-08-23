/*
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

let State = "";
let loc = 0;
let decoder = null;

function processVideoFrame(tile) {
    self.postMessage(
        {
            type: "tile",
            loc,
            tile,
        },
        [tile]
    );
}

self.addEventListener("message", async function (e) {
    const type = e.data.type;
    if (type === "init") {
        State = "initialized";
        loc = e.data.loc;
        decoder = new VideoDecoder({
            output: (tile) => {
                processVideoFrame(tile);
            },
            error: (err) => {
                sendMessageToMain(
                    WORKER_PREFIX,
                    "error",
                    "Video decoder. err: " + err.message
                );
            },
        });
    } else if (type == "encodedTile") {
        if (State === "") {
            return;
        }
        const decoderConfig = e.data.metadata.decoderConfig;
        if (decoderConfig) {
            decoderConfig.hardwareAcceleration = "prefer-software";
            decoderConfig.optimizeForLatency = true;
            decoder.configure(decoderConfig);
        }
        const encodedChunk = e.data.chunk;
        decoder.decode(encodedChunk);
    }
});
