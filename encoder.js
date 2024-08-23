/*
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

let State = "";

let loc = 0;
let encoder = null;

const initVideoEncoder = {
    output: handleChunk,
    error: (e) => {
        console.error(e.message);
    },
};

function handleChunk(chunk, metadata) {
    const msg = {
        type: "encodedTile",
        loc,
        chunk,
        metadata,
    };
    self.postMessage(msg);
}

self.addEventListener("message", async function (e) {
    const type = e.data.type;
    if (type === "init") {
        State = "initialized";

        loc = e.data.loc;
        const encoderConfig = e.data.encoderConfig;
        encoder = new VideoEncoder(initVideoEncoder);
        encoder.configure(encoderConfig);
    } else if (type === "tile") {
        if ((State = "")) {
            if (e.data.tile) {
                e.data.tile.close();
            }
            return;
        }
        const tile = e.data.tile;
        const insertKeyframe = e.data.isKey;
        encoder.encode(tile, { keyFrame: insertKeyframe });
        tile.close();
    }
});
