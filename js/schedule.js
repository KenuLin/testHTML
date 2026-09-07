// 賽程與轉播時間查詢頁 — 純前端、無後端，同樣的做法：build 時（在 Football
// 專案跑 npm run crawl:fixtures + npm run export:static）把資料庫內容匯出成
// data/matches.json，這頁載入一次後在瀏覽器端做篩選，不需要任何 API。
//
// 2026 世界盃已經結束，104 場的隊伍/比分/時間都是固定的歷史資料，所以這裡
// 沒有「即時更新」的需求 — 之後如果拿來做下一屆賽事，記得資料要重新跑一次
// crawl:fixtures + export:static。

(function () {
    "use strict";

    var DATA_URL = "data/matches.json";
    var matches = [];

    var STAGE_ZH = {
        "Group stage": "小組賽",
        "Round of 32": "32強",
        "Round of 16": "16強",
        "Quarter-finals": "8強",
        "Semi-finals": "4強",
        "Third place play-off": "季軍賽",
        "Final": "冠軍賽",
    };

    var els = {};

    function bilingualText(en, zh) {
        return zh ? en + "（" + zh + "）" : en || "";
    }

    function stageLabel(m) {
        var label = STAGE_ZH[m.stage] || m.stage;
        return m.groupName ? label + " · " + m.groupName : label;
    }

    function buildTeamList() {
        var byName = {};
        matches.forEach(function (m) {
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

    function populateTeamSelect() {
        var teams = buildTeamList();
        teams.forEach(function (t) {
            var opt = document.createElement("option");
            opt.value = t.name;
            opt.textContent = bilingualText(t.name, t.nameZh);
            els.teamSelect.appendChild(opt);
        });
    }

    function matchCard(m, teamName) {
        var li = document.createElement("li");
        li.className = "match-card";

        var top = document.createElement("div");
        top.className = "match-top";
        var badge = document.createElement("span");
        badge.className = "stage-badge";
        badge.textContent = stageLabel(m);
        top.appendChild(badge);
        li.appendChild(top);

        var isHome = m.homeTeam && m.homeTeam.name === teamName;
        var opponent = isHome ? m.awayTeam : m.homeTeam;
        var self = isHome ? m.homeTeam : m.awayTeam;

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

        var teamsLine = document.createElement("div");
        teamsLine.className = "match-teams";
        var scoreSpan = document.createElement("span");
        scoreSpan.className = "match-score";
        if (m.homeScore != null && m.awayScore != null) {
            scoreSpan.textContent = isHome ? m.homeScore + " – " + m.awayScore : m.awayScore + " – " + m.homeScore;
        } else {
            scoreSpan.textContent = "vs";
        }
        teamsLine.appendChild(teamNameBlock(self, "this-team"));
        teamsLine.appendChild(scoreSpan);
        teamsLine.appendChild(teamNameBlock(opponent, "opponent"));
        li.appendChild(teamsLine);

        var meta = document.createElement("div");
        meta.className = "match-meta";

        var taiwanRow = document.createElement("div");
        taiwanRow.className = "full";
        var taiwanK = document.createElement("span");
        taiwanK.className = "k";
        taiwanK.textContent = "台灣時間";
        taiwanRow.appendChild(taiwanK);
        taiwanRow.appendChild(document.createTextNode(m.kickoffTaiwan ? m.kickoffTaiwan.replace(" ", " ") : "—"));
        meta.appendChild(taiwanRow);

        var localRow = document.createElement("div");
        var localK = document.createElement("span");
        localK.className = "k";
        localK.textContent = "當地時間";
        localRow.appendChild(localK);
        localRow.appendChild(document.createTextNode(m.kickoffLocal || "—"));
        meta.appendChild(localRow);

        var venueRow = document.createElement("div");
        var venueK = document.createElement("span");
        venueK.className = "k";
        venueK.textContent = "場地";
        venueRow.appendChild(venueK);
        venueRow.appendChild(
            document.createTextNode(m.venue ? m.venue + (m.city ? "，" + m.city : "") : "—")
        );
        meta.appendChild(venueRow);

        li.appendChild(meta);
        return li;
    }

    function renderSchedule(teamName) {
        els.matchList.replaceChildren();
        if (!teamName) {
            els.emptyState.hidden = true;
            return;
        }
        var teamMatches = matches
            .filter(function (m) {
                return (m.homeTeam && m.homeTeam.name === teamName) || (m.awayTeam && m.awayTeam.name === teamName);
            })
            .sort(function (a, b) {
                return (a.kickoffUtc || "").localeCompare(b.kickoffUtc || "");
            });

        els.emptyState.hidden = teamMatches.length > 0;
        teamMatches.forEach(function (m) {
            els.matchList.appendChild(matchCard(m, teamName));
        });
    }

    function onTeamChange() {
        var teamName = els.teamSelect.value;
        renderSchedule(teamName);
        var url = new URL(window.location.href);
        if (teamName) {
            url.searchParams.set("team", teamName);
        } else {
            url.searchParams.delete("team");
        }
        history.replaceState(null, "", url);
    }

    function init() {
        els.subtitle = document.getElementById("subtitle");
        els.teamSelect = document.getElementById("team-select");
        els.emptyState = document.getElementById("empty-state");
        els.matchList = document.getElementById("match-list");

        els.teamSelect.addEventListener("change", onTeamChange);

        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (data) {
                matches = data;
                els.subtitle.textContent = "共收錄 " + matches.length + " 場賽事，選擇球隊查看完整賽程與比分。";
                populateTeamSelect();

                var preselect = new URLSearchParams(window.location.search).get("team");
                if (preselect && Array.from(els.teamSelect.options).some((o) => o.value === preselect)) {
                    els.teamSelect.value = preselect;
                    renderSchedule(preselect);
                }
            })
            .catch(function (err) {
                els.subtitle.textContent = "資料載入失敗，請稍後再試。";
                console.error(err);
            });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
