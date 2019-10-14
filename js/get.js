window._run__script_ = function (option) {
    option.proxy = option.proxy || '';
    option.url = option.url || location.href;
    option.trySkip = option.trySkip || false;//尝试跳过特殊集. 如"11.5","总集篇"这类
    option.playResX = option.playResX || 1920;
    option.playResY = option.playResY || 1080;
    option.fontSize = option.fontSize || 20;
    option.holdTimeMove = option.holdTimeMove || 20;
    option.holdTimePos = option.holdTimePos || 6;
    option.fontAlpha = option.fontAlpha || "88";// 00 ~ FF
    option.logging = option.logging || console.log;
    option.hiddenLoading = option.hiddenLoading || function () {
    };

    //弹幕出现时间偏移设置. 正数提前, 负数延后.
    option.offset = parseFloat(option.offset);
    if (isNaN(option.offset)) {
        option.offset = 0.000;
    }

    //https://github.com/Stuk/jszip 用于zip打包多个文件
    loadScript("https://str.flysay.com/js/JSZip/jszip.min.js", function () {
        loadScript("https://str.flysay.com/js/FileSaver/FileSaver.js", function () {
            start();
        });
    });

    function start() {
        option.logging('开始解析地址');

        // 获取番剧标题
        ajax({
            url: option.proxy + option.url,
            success: function (res) {
                let titleRegex = new RegExp(/<meta\sname="keywords"\s+content="([^"]+)"/);
                let titleRes = titleRegex.exec(res.responseText);
                if (!titleRes) {

                    option.hiddenLoading();
                    option.logging('无法获取标题, 需确定当前链接为番剧播放页面');
                    throw "无法获取标题, 需确定当前链接为番剧播放页面"
                }

                // 获取番剧的播放列表
                let epList = [];
                let epListRes = (new RegExp(/"epList":(\[{".+}]),"epInfo"/)).exec(res.responseText);
                if (!!epListRes && epListRes.length) {
                    let epJson = JSON.parse(epListRes[1]);
                    for (let i in epJson) {
                        if (option.trySkip && parseInt(epJson[i]["title"]) != epJson[i]["title"]) {
                            option.logging("跳过特殊集:" + epJson[i]["longTitle"]);
                            continue;
                        }

                        epList.push({
                            i: epJson[i]["i"],
                            title: epJson[i]["title"],
                            cid: epJson[i]["cid"],
                            longTitle: epJson[i]["longTitle"].replace(/\//ig, '-'), //longTitle为"教科书\u002F催眠术\u002F睡醒\u002F打水漂"这种格式在zip打包时会生成层级目录, 所以使用了String.replace()
                        })
                    }
                    option.logging('开始下载' + epList.length + '个弹幕');
                    getDanMu(titleRes[1], epList);
                } else {
                    option.logging('无法从HTML中获取内容');
                    option.hiddenLoading();
                    throw "无法获取内容";
                }
            }, error: function (err) {
                option.logging('无法从远程地址中获取内容');
                option.hiddenLoading();
                console.log(err);
                throw "无法从远程地址中获取内容";
            }
        });
    }

    function getDanMu(title, epList) {
        let stringJson = [];
        let itemIndex = 0;
        epList.forEach(function (item) {
            ajax({
                url: option.proxy + "https://api.bilibili.com/x/v1/dm/list.so?oid=" + item.cid,
                success: function (res) {
                    let fileName = title + " " + (item.title.padStart(('' + (epList.length < 2 ? '00' : epList.length)).length, "0")) + " " + item.longTitle + ".ass";

                    option.logging('开始转换(' + (++itemIndex) + '/' + epList.length + '): ' + fileName);
                    stringJson.push({
                        "content": handleXml(res.responseXML),
                        "i": item.i,
                        "title": item.title,
                        "longTitle": item.longTitle,
                        "fileName": fileName,
                    });

                    if (epList.length === stringJson.length) {
                        stringJson.sort(dmSortCompare); // 根据集数排序

                        if (!option.doNotDownload) {
                            option.logging('转换成功, 正在打包下载');
                            download(title, stringJson, option.callback);
                        } else {
                            option.callback && option.callback(title, stringJson);
                        }
                    }
                }, error: function (err) {
                    option.logging('无法从远程地址中获取弹幕');
                    option.hiddenLoading();
                    console.log(err);
                    throw "无法从远程地址中获取弹幕";
                }
            });
        });
    }

    function download(title, stringResult, callback) {
        let zip = new JSZip();
        stringResult.forEach(function (item) {
            zip.file(item.fileName, item.content)
        });
        zip.generateAsync({type: "blob"}).then(function (blob) { // 1) generate the zip file
            saveAs(blob, title + ".zip");
            callback && callback(title, stringResult)
        }, function (err) {
            option.hiddenLoading();
            option.logging('打包下载失败');
            throw err;
        });
    }

    function numGroup(num, precision) {
        while (true) {
            if (num && num % precision === 0) {
                return num;
            }
            num++;
        }
    }

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    // 将颜色的数值化为十六进制字符串表示
    function RRGGBB(color) {
        let t = Number(color).toString(16).toUpperCase();
        return (Array(7).join('0') + t).slice(-6);
    }

    function dmSortCompare(a, b) {
        if (a.i < b.i) {
            return -1;
        }
        if (a.i > b.i) {
            return 1;
        }
        return 0;
    }

    function nodeSortCompare(a, b) {
        let aTime = parseFloat(a.getAttribute("p").split(",")[0]);
        let bTime = parseFloat(b.getAttribute("p").split(",")[0]);

        if (aTime < bTime) {
            return -1;
        }
        if (aTime > bTime) {
            return 1;
        }
        return 0;
    }

    function handleXml(res) {
        let mode = [undefined, 'RightMode1', 'RightMode1', 'RightMode1', 'TopMode1', 'TopMode1'];
        let PlayResX = option.playResX;
        let PlayResY = option.playResY;
        let fontSize = option.fontSize;
        let holdTimeMove = option.holdTimeMove;
        let holdTimePos = option.holdTimePos;
        let alpha = option.fontAlpha;// 00 ~ FF


        // *颜色格式：&Haabbggrr，均为十六进制，取值0-F。
        // 前2位(alpha)为透明度，00=不透明，FF=DEC255=全透明；后6是BGR蓝绿红颜色。 排在最前的00可以忽略不写, 如：{\c&HFF&}={\c&H0000FF&}为纯红色、&HFFFFFF=纯白色、&HC8000000=透明度为200的黑色。

        let assFile = "[Script Info]\n" +
            "Title: bilibili\n" +
            "Original Script: 生成\n" +
            "ScriptType: v4.00+\n" +
            "Collisions: Normal\n" +
            "PlayResX: " + PlayResX + "\n" +
            "PlayResY: " + PlayResY + "\n" +
            "WrapStyle: 0\n" +
            "\n" +
            "[V4+ Styles]\n" +
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n" +
            "Style: RightMode1,Microsoft YaHei UI," + fontSize + ",&H" + alpha + "FFFFFF,&H" + alpha + "FFFFFF,&H" + alpha + "000000,&H" + alpha + "000000,-1,0,0,0,100,100,0,0,1,1,0,2,20,20,2,0\n" +
            "Style: TopMode1,Microsoft YaHei UI," + fontSize + ",&H" + alpha + "FFFFFF,&H" + alpha + "FFFFFF,&H" + alpha + "000000,&H" + alpha + "000000,-1,0,0,0,100,100,0,0,1,1,0,2,20,20,2,0\n" +
            "\n" +
            "[Events]\n" +
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Tex\n";

        let nodes = [];
        res.firstChild.childNodes.forEach(function (node) {
            if (node.nodeName !== "d") {
                return;
            }
            nodes.push(node);
        });

        let eachTopsCurrentEndTimeArr = {};
        let eachLinesCurrentEndTimeArr = {};

        nodes.sort(nodeSortCompare).forEach(function (node) {
            if (node.nodeName !== "d") {
                return;
            }

            let attr = node.getAttribute("p").split(",");
            let time = parseFloat(attr[0]) - option.offset;
            let timeInt = Math.floor(time);

            if (timeInt < 0 || time < 0 || isNaN(time)) {
                return;
            }

            let startTime = Math.floor((time / 3600) % 24) + ":" + Math.floor((time / 60) % 60) + ":" + (time % 60).toFixed(2);
            let color = "";
            if (parseInt(attr[3]) !== 16777215) { // 16777215 白色
                color = '\\c&H' + RRGGBB(parseInt(attr[3], 10) & 0xffffff).split(/(..)/).reverse().join('');
            }

            if (mode[attr[1]] === "TopMode1") {
                let timePos = time + holdTimePos;
                let y = fontSize;
                for (let i = 0; i < (PlayResY / fontSize); i++) {
                    if (eachTopsCurrentEndTimeArr.hasOwnProperty(i) && eachTopsCurrentEndTimeArr[i].out > time - 2) {
                        //存在的行晚于新出的行
                        continue
                    }
                    y += i * fontSize;
                    eachTopsCurrentEndTimeArr[i] = {
                        out: timePos,
                    };
                    break
                }
                let endTimePos = Math.floor((timePos / 3600) % 24) + ":" + Math.floor((timePos / 60) % 60) + ":" + (timePos % 60).toFixed(2);
                assFile += "Dialogue: 0," + startTime + "," + endTimePos + "," + mode[attr[1]] + ",,20,20,2,," + "{\\pos(" + Math.floor(PlayResX / 2) + "," + y + ")" + color + "}" + node.textContent + "\n";
            } else {
                let x = Math.floor(node.textContent.length * fontSize / 2);
                let timeMove = time + getRandomArbitrary(holdTimeMove - 3 > 0 ? holdTimeMove - 3 : 1, holdTimeMove - 3 > 0 ? holdTimeMove + 3 : 4);
                let endTimeMove = Math.floor((timeMove / 3600) % 24) + ":" + Math.floor((timeMove / 60) % 60) + ":" + (timeMove % 60).toFixed(2);

                let y = fontSize;

                //todo 超出的行考虑删除
                let perSecondSpeed = PlayResX / (timeMove - time); //每秒移动多少像素
                let currentTextSpeedOffset = (node.textContent.length * fontSize / perSecondSpeed);//因为字体长度与随机速度的原因, 每条弹幕的速度是有一定偏差的. 这里保持着上一次的偏差值
                for (let i = 0; i < (PlayResY / fontSize); i++) {
                    if (eachLinesCurrentEndTimeArr.hasOwnProperty(i)) {
                        if (eachLinesCurrentEndTimeArr[i].out > timeMove - currentTextSpeedOffset || eachLinesCurrentEndTimeArr[i].in > time - eachLinesCurrentEndTimeArr[i].textOffsetSpeed) {
                            //存在的行晚于新出的行
                            continue
                        }
                    }
                    y += i * fontSize;
                    eachLinesCurrentEndTimeArr[i] = {
                        in: time,
                        out: timeMove,
                        textOffsetSpeed: currentTextSpeedOffset,
                    };
                    break
                }

                assFile += "Dialogue: 0," + startTime + "," + endTimeMove + "," + mode[attr[1]] + ",,20,20,2,," + "{\\move(" + (PlayResX + x) + "," + y + "," + (-x) + "," + y + ")" + color + "}" + node.textContent + "\n";
            }
        });

        return assFile;
    }

    function loadScript(src, callback) {
        let loadedScript = document.querySelectorAll('head script');
        for (let i = 0; i < loadedScript.length; i++) {
            if (loadedScript[i].src === src) {
                callback && callback();
                return;
            }
        }

        let script = document.createElement('script');
        script.onload = function () {
            script.onload = null;
            callback && callback();
        };
        script.src = src;
        document.getElementsByTagName('head')[0].appendChild(script);
    }

    function ajax(option) {
        let url = option.url || '',
            method = option.method || 'GET',
            data = option.data,
            headers = option.headers || {},
            success = option.success,
            error = option.error;

        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200 || this.status === 304) {
                    success && success(this);
                } else {
                    error && error(this);
                }
            }
        };
        xhr.open(method, url, true);
        for (let k in headers) {
            xhr.setRequestHeader(k, headers[k]);
        }
        if (data) {
            xhr.send(data);
        } else {
            xhr.send();
        }
    }
};
