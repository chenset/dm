//todo 这里要加载protobuf.js, see: https://github.com/dcodeio/protobuf.js for details
// core.xxxxx.js
var jsonTypes = JSON.parse('{"nested":{"bilibili":{"nested":{"community":{"nested":{"service":{"nested":{"dm":{"nested":{"v1":{"nested":{"DmWebViewReply":{"fields":{"state":{"type":"int32","id":1},"text":{"type":"string","id":2},"textSide":{"type":"string","id":3},"dmSge":{"type":"DmSegConfig","id":4},"flag":{"type":"DanmakuFlagConfig","id":5},"specialDms":{"rule":"repeated","type":"string","id":6},"checkBox":{"type":"bool","id":7},"count":{"type":"int64","id":8},"commandDms":{"rule":"repeated","type":"CommandDm","id":9},"dmSetting":{"type":"DanmuWebPlayerConfig","id":10},"reportFilter":{"rule":"repeated","type":"string","id":11}}},"CommandDm":{"fields":{"oid":{"type":"int64","id":2},"mid":{"type":"int64","id":3},"command":{"type":"string","id":4},"content":{"type":"string","id":5},"progress":{"type":"int32","id":6},"ctime":{"type":"string","id":7},"mtime":{"type":"string","id":8},"extra":{"type":"string","id":9},"dmid":{"type":"string","id":10}}},"DmSegConfig":{"fields":{"pageSize":{"type":"int64","id":1},"total":{"type":"int64","id":2}}},"DanmakuFlagConfig":{"fields":{"recFlag":{"type":"int32","id":1},"recText":{"type":"string","id":2},"recSwitch":{"type":"int32","id":3}}},"DmSegMobileReply":{"fields":{"elems":{"rule":"repeated","type":"DanmakuElem","id":1}}},"DanmakuElem":{"fields":{"progress":{"type":"int32","id":2},"mode":{"type":"int32","id":3},"fontsize":{"type":"int32","id":4},"color":{"type":"uint32","id":5},"midHash":{"type":"string","id":6},"content":{"type":"string","id":7},"ctime":{"type":"int64","id":8},"weight":{"type":"int32","id":9},"action":{"type":"string","id":10},"pool":{"type":"int32","id":11},"dmid":{"type":"string","id":12},"attr":{"type":"int32","id":13}}},"DanmuWebPlayerConfig":{"fields":{"dmSwitch":{"type":"bool","id":1},"aiSwitch":{"type":"bool","id":2},"aiLevel":{"type":"int32","id":3},"typeTop":{"type":"bool","id":4},"typeScroll":{"type":"bool","id":5},"typeBottom":{"type":"bool","id":6},"typeColor":{"type":"bool","id":7},"typeSpecial":{"type":"bool","id":8},"preventshade":{"type":"bool","id":9},"dmask":{"type":"bool","id":10},"opacity":{"type":"float","id":11},"dmarea":{"type":"int32","id":12},"speedplus":{"type":"float","id":13},"fontsize":{"type":"float","id":14},"fullscreensync":{"type":"bool","id":15},"speedsync":{"type":"bool","id":16},"fontfamily":{"type":"string","id":17},"bold":{"type":"bool","id":18},"fontborder":{"type":"int32","id":19}}}}}}}}}}}}}}}');
let root = protobuf.Root.fromJSON(jsonTypes);
let message = root.lookupType("bilibili.community.service.dm.v1.DmSegMobileReply");

let o = new XMLHttpRequest;
// o.open("get", "https://request.flysay.com/https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=367022865&segment_index=1", !0); //todo 加载v2版本的dm数据
o.open("get", "seg.so", !0); //todo 加载v2版本的dm数据
o.responseType = "arraybuffer";
o.addEventListener("load", (function () {
        let payload = new Uint8Array(o.response);
        const err = message.verify(payload);
        if (err) {
            throw err;
        }
        const elems = message.decode(payload).elems;
        if (elems) {
            for (let i = 0; i < elems.length; i++) {
                if (elems[i].mode == 5){
                    console.log(elems[i])
                }
            }
        }
    }
));
o.send();
