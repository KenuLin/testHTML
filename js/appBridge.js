// --- 工具函式 (Cookie & 裝置資訊) ---

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function showInfo() {
    var platform = navigator.platform.toLowerCase();
    var cookies = document.cookie;
    var userAgent = navigator.userAgent;

    document.getElementById('showInfo').innerHTML = 
        "Platform: " + platform + "<br><br>Cookies: " + cookies + "<br><br>UserAgent: " + userAgent;
}

// --- 接收 App 呼叫 (From App) ---

function callJSFromApp(message) {
    document.getElementById("testDemo").innerHTML = message;
}

function sendMessage(message) {
    document.getElementById("appSendString").innerHTML = message;
    return "{\"status\":\"success\",\"value\":321}";
}

function dicationaryFromApp(dicationary) {
    var sDecodedParam = window.atob(dicationary);
    var dic = JSON.parse(sDecodedParam);
    var token = dic["token"];
    document.getElementById("appSendDict").innerHTML = token;
}

// --- 呼叫原生 App (To App) ---

function jsCalliOS1() {
    window.webkit.messageHandlers.ToApp1.postMessage(131);
}

function jsCalliOS2() {
    window.webkit.messageHandlers.ToApp2.postMessage({"token": "abboke"});
}

function jsCalliOS3(message) {
    window.JsInterface.searchJob(message);
}

function jsCalliOS4(message) {
    window.webkit.messageHandlers.appFunction.postMessage(message);
    window.JsInterface.searchJob(message);
}

// --- DeepLink 與跳轉邏輯 ---

function checkAppInstalled(appScheme) {
    var now = new Date().valueOf();
    setTimeout(function () {
        if (new Date().valueOf() - now > 100) return;
        window.location = "https://itunes.apple.com/tw/app/1111-zhao-gong-zuo/id805959101";
    }, 50);
    window.location = appScheme;
}

function jsCallDeepLink(message, id) {
    var ua = navigator.userAgent || "";
    var isAndroid = /Android/i.test(ua);
    var isiOS = /iPhone|iPad|iPod/i.test(ua);
    var cookies = document.cookie;

    // 1) App 內的 WebView：走原生 bridge
    if (isiOS && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.appFunction) {
        window.webkit.messageHandlers.appFunction.postMessage({
            type: "openCompany",
            payload: message
        });
        document.getElementById(id).innerHTML = "Platform: iOS WKWebView<br>Cookies: " + cookies;
        return;
    }
    if (isAndroid && window.JsInterface && typeof window.JsInterface.searchJob === "function") {
        window.JsInterface.searchJob(message);
        document.getElementById(id).innerHTML = "Platform: Android WebView<br>Cookies: " + cookies;
        return;
    }

    // 2) 純瀏覽器：URL Scheme + Fallback
    var schemeUrl = "job1111://www.1111.com.tw/app?ajbl=" + encodeURIComponent(message);
    var appStoreUrl = "https://apps.apple.com/app/idXXXXXXXXX";
    var playStoreUrl = "https://play.google.com/store/apps/details?id=com.xxx";
    var fallback = isiOS ? appStoreUrl : (isAndroid ? playStoreUrl : "https://www.1111.com.tw/");

    var start = Date.now();
    window.location.href = schemeUrl;

    setTimeout(function () {
        if (Date.now() - start < 1500) {
            window.location.href = fallback;
        }
    }, 1200);

    document.getElementById(id).innerHTML = "Platform: " + (isiOS ? "iOS" : (isAndroid ? "Android" : "Other")) + "<br>Cookies: " + cookies;
}

function turnToUrl(address, id) {
    var appLink = getAppDeepLink(address);
    var resultText = appLink;
    var platform = navigator.platform.toLowerCase();

    if (appLink !== -1) {
        if (platform.indexOf('android') !== -1 || platform.indexOf('linux') !== -1) {
            window.JsInterface.searchJob(address);
            resultText += ' Android ';
        } else if (platform.indexOf('iphone') !== -1 || platform.indexOf('ipad') !== -1 || platform.indexOf('ipod') !== -1) {
            window.webkit.messageHandlers.appFunction.postMessage(address);
            resultText += ' iOS ';
        } else {
            resultText += ' other ';
        }
    } else {
        window.location.href = address;
        resultText += ' Web ';
    }
    document.getElementById(id).innerHTML = resultText;
}

function getAppDeepLink(webAddress) {
    if (webAddress.indexOf('https://www.1111.com.tw/job/') !== -1) {
        return check1111URL(webAddress, 'https://www.1111.com.tw/job/', 'A01_14_P01-');
    } else if (webAddress.indexOf('https://www.1111.com.tw/corp/') !== -1) {
        return check1111URL(webAddress, 'https://www.1111.com.tw/corp/', 'A01_15_P01-');
    } else {
        return -1;
    }
}

function check1111URL(webAddress, checkAddress, appLink) {
    if (webAddress.indexOf(checkAddress) !== -1) {
        var strs = webAddress.split(checkAddress);
        var linkT = "";
        for (var i = 0; i < strs.length; i++) {
            if (strs[i] !== "") {
                linkT = strs[i].split('/')[0];
            }
        }
        return appLink + linkT;
    }
    return -1;
}
