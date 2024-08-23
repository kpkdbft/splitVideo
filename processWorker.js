/*
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

let tileNum = null;
let State = "";

self.addEventListener("message", async function (e) {
    let type = e.data.type;
    if (type === "init") {
        State = "initialized";
        tileNum = e.data.tileNum;
    } else if (type === "stream") {
        let stream = e.data.stream;
        for await (const vframe of stream) {
            // Do something with each 'chunk'
            // console.debug(vframe);
            if (State === "") {
                continue;
            }
            let tileWidth = vframe.displayWidth / tileNum;
            let tileHeight = vframe.displayHeight / tileNum;
            const options = {
                duration: vframe.duration,
                timeStamp: vframe.timeStamp,
                visibleRect: {
                    x: 0,
                    y: 0,
                    width: tileWidth,
                    height: tileHeight,
                },
            };

            for (let i = 0; i < tileNum * tileNum; i++) {
                let loc = { x: i % tileNum, y: Math.floor(i / tileNum) };
                options.visibleRect.x = tileWidth * loc.x;
                options.visibleRect.y = tileHeight * loc.y;
                const tile = new VideoFrame(vframe, options);
                self.postMessage({ type: "tile", tile, loc }, [tile]);
            }
            vframe.close();
        }
    }
});
