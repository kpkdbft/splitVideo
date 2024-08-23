/*
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

let State = "";

let canvas = null;
let drawWidth = null;
let drawHeight = null;
let ctx = null;

self.addEventListener("message", async function (e) {
    let type = e.data.type;
    if (type === "init") {
        State = "initialized";

        canvas = e.data.canvas;
        ctx = canvas.getContext("2d");
        drawWidth = e.data.drawWidth;
        drawHeight = e.data.drawHeight;
    } else if (type === "tile") {
        if (State === "") {
            return;
        }
        const tile = e.data.tile;
        ctx.drawImage(tile, 0, 0, drawWidth, drawHeight);
        tile.close();
    }
});
