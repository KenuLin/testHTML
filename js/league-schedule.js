// 五大聯賽（英超/西甲/德甲/義甲/法甲）賽程與轉播查詢頁 — 純前端、無後端，
// 做法跟 schedule.js（世界盃賽程）一樣：build 時（在 Football 專案跑
// npm run crawl:league-fixtures + npm run export:static）把整季賽程匯出成
// data/league-matches.json，這頁載入一次後在瀏覽器端做篩選。
//
// 跟世界盃賽程不同的地方：這是俱樂部聯賽，賽季還在進行中，所以預設只顯示
// 「尚未開踢」的未來場次（比對 kickoffUtc 跟現在時間），符合使用者的原始
// 需求「在未來哪一天我可以看直播」；使用者可以取消勾選來看已賽場次的比分。
//
// 台灣轉播權每季可能會變動 — 西甲是 DAZN Taiwan 獨家，其餘四個聯賽走
// ELTA.tv（部分場次 MOD／Hami Video 同步），資料在 export-static.ts 的
// LEAGUE_TV_NOTES 裡維護，這裡只是原樣顯示。

(function () {
    "use strict";

    var DATA_URL = "data/league-matches.json";
    var allMatches = [];

    var LEAGUE_ZH = {
        "Premier League": "英超",
        "La Liga": "西甲",
        Bundesliga: "德甲",
        "Serie A": "義甲",
        "Ligue 1": "法甲",
    };
    var LEAGUE_ORDER = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"];

    var els = {};

    function bilingualText(en, zh) {
        return zh ? en + "（" + zh + "）" : en || "";
    }

    function leagueLabel(league) {
        var zh = LEAGUE_ZH[league];
        return zh ? league + "（" + zh + "）" : league;
    }

    function leaguesPresent() {
        var present = {};
        allMatches.forEach(function (m) {
            present[m.league] = true;
        });
        return LEAGUE_ORDER.filter(function (l) {
            return present[l];
        });
    }

    function populateLeagueSelect() {
        leaguesPresent().forEach(function (league) {
            var opt = document.createElement("option");
            opt.value = league;
            opt.textContent = leagueLabel(league);
            els.leagueSelect.appendChild(opt);
        });
    }

    function teamsInLeague(league) {
        var byName = {};
        allMatches.forEach(function (m) {
            if (m.league !== league) return;
            [m.homeTeam, m.awayTeam].forEach(function (t) {
                if (t && !byName[t.name]) byName[t.name] = t;
            });
        });
        return Object.keys(byName)
            .map(function (name) {
                return byName[name];
            })
            .sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });
    }

    function populateTeamSelect(league) {
        els.teamSelect.replaceChildren();
        var allOpt = document.createElement("option");
        allOpt.value = "";
        allOpt.textContent = "— 全部球隊 —";
        els.teamSelect.appendChild(allOpt);

        if (!league) {
            els.teamSelect.disabled = true;
            return;
        }
        els.teamSelect.disabled = false;
        teamsInLeague(league).forEach(function (t) {
            var opt = document.createElement("option");
            opt.value = t.name;
            opt.textContent = bilingualText(t.name, t.nameZh);
            els.teamSelect.appendChild(opt);
        });
    }

    function updateTvBanner(league) {
        var m = allMatches.filter(function (mm) {
            return mm.league === league;
        })[0];
        if (!m || !m.tvNote) {
            els.tvBanner.hidden = true;
            return;
        }
        els.tvBanner.textContent = "📺 台灣轉播：" + m.tvNote;
        els.tvBanner.hidden = false;
    }

    function teamNameBlock(team, extraClass) {
        var span = document.createElement("span");
        span.className = extraClass;
        span.appendChild(document.createTextNode(team ? team.name : "—"));
        if (team && team.nameZh) {
            var zh = document.createElement("span");
            zh.className = "zh-inline";
            zh.textContent = team.nameZh;
            span.appendChild(zh);
        }
        return span;
    }

    function matchCard(m) {
        var li = document.createElement("li");
        li.className = "match-card";

        var top = document.createElement("div");
        top.className = "match-top";
        var badge = document.createElement("span");
        badge.className = "stage-badge";
        badge.textContent = m.round ? "第 " + m.round + " 輪" : "—";
        top.appendChild(badge);
        var dateSpan = document.createElement("span");
        dateSpan.className = "match-date";
        dateSpan.textContent = m.kickoffTaiwan ? m.kickoffTaiwan + "（台灣時間）" : "時間未定";
        top.appendChild(dateSpan);
        li.appendChild(top);

        var teamsLine = document.createElement("div");
        teamsLine.className = "match-teams";
        var scoreSpan = document.createElement("span");
        scoreSpan.className = "match-score";
        if (m.homeScore != null && m.awayScore != null) {
            scoreSpan.textContent = m.homeScore + " – " + m.awayScore;
        } else {
            scoreSpan.textContent = "vs";
        }
        teamsLine.appendChild(teamNameBlock(m.homeTeam, "this-team"));
        teamsLine.appendChild(scoreSpan);
        teamsLine.appendChild(teamNameBlock(m.awayTeam, "opponent"));
        li.appendChild(teamsLine);

        var meta = document.createElement("div");
        meta.className = "match-meta";
        var venueRow = document.createElement("div");
        venueRow.className = "full";
        var venueK = document.createElement("span");
        venueK.className = "k";
        venueK.textContent = "場地";
        venueRow.appendChild(venueK);
        venueRow.appendChild(document.createTextNode(m.venue || "—"));
        meta.appendChild(venueRow);
        li.appendChild(meta);

        return li;
    }

    function render() {
        var league = els.leagueSelect.value;
        var team = els.teamSelect.value;
        var futureOnly = els.futureOnly.checked;

        els.matchList.replaceChildren();

        if (!league) {
            els.emptyState.hidden = true;
            els.tvBanner.hidden = true;
            return;
        }

        updateTvBanner(league);

        var now = new Date();
        var list = allMatches
            .filter(function (m) {
                if (m.league !== league) return false;
                if (team && m.homeTeam.name !== team && m.awayTeam.name !== team) return false;
                if (futureOnly && m.kickoffUtc && new Date(m.kickoffUtc) < now) return false;
                return true;
            })
            .sort(function (a, b) {
                return (a.kickoffUtc || "").localeCompare(b.kickoffUtc || "");
            });

        els.emptyState.hidden = list.length > 0;
        list.forEach(function (m) {
            els.matchList.appendChild(matchCard(m));
        });
    }

    function syncUrl() {
        var url = new URL(window.location.href);
        var league = els.leagueSelect.value;
        var team = els.teamSelect.value;
        if (league) {
            url.searchParams.set("league", league);
        } else {
            url.searchParams.delete("league");
        }
        if (team) {
            url.searchParams.set("team", team);
        } else {
            url.searchParams.delete("team");
        }
        history.replaceState(null, "", url);
    }

    function onLeagueChange() {
        populateTeamSelect(els.leagueSelect.value);
        render();
        syncUrl();
    }

    function onTeamOrToggleChange() {
        render();
        syncUrl();
    }

    function init() {
        els.subtitle = document.getElementById("subtitle");
        els.leagueSelect = document.getElementById("league-select");
        els.teamSelect = document.getElementById("team-select");
        els.tvBanner = document.getElementById("tv-banner");
        els.futureOnly = document.getElementById("future-only");
        els.emptyState = document.getElementById("empty-state");
        els.matchList = document.getElementById("match-list");

        els.leagueSelect.addEventListener("change", onLeagueChange);
        els.teamSelect.addEventListener("change", onTeamOrToggleChange);
        els.futureOnly.addEventListener("change", onTeamOrToggleChange);

        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (data) {
                allMatches = data;
                els.subtitle.textContent =
                    "共收錄五大聯賽 " + allMatches.length + " 場賽事，選擇聯賽與球隊查看賽程、比分與轉播資訊。";
                populateLeagueSelect();

                var params = new URLSearchParams(window.location.search);
                var preLeague = params.get("league");
                var preTeam = params.get("team");
                if (preLeague && Array.from(els.leagueSelect.options).some((o) => o.value === preLeague)) {
                    els.leagueSelect.value = preLeague;
                    populateTeamSelect(preLeague);
                    if (preTeam && Array.from(els.teamSelect.options).some((o) => o.value === preTeam)) {
                        els.teamSelect.value = preTeam;
                    }
                    render();
                }
            })
            .catch(function (err) {
                els.subtitle.textContent = "資料載入失敗，請稍後再試。";
                console.error(err);
            });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
