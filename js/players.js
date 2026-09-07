// 足球員資訊查詢頁 — 純前端、無後端。
//
// 所有球員資料都在 build 時（npm run export:static，在 Football 專案裡執行）
// 匯出成 data/players.json，這頁載入一次整包 JSON 後在瀏覽器端做搜尋/篩選，
// 沒有任何 API 呼叫，適合放在 GitHub Pages 這種純靜態環境。
//
// 如果之後資料變多（例如加入多屆世界盃），這個「載入整包 JSON」的作法可能會
// 變得太重，屆時可以考慮拆成多個檔案或改用簡易的靜態搜尋索引，但現在 1000
// 多筆球員資料（未壓縮也才數百 KB）還在合理範圍內，先求簡單能動。

(function () {
    "use strict";

    var DATA_URL = "data/players.json";
    var players = [];

    var els = {};

    function initialsOf(name) {
        return (name || "")
            .split(" ")
            .map(function (part) {
                return part[0];
            })
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();
    }

    /** Builds an avatar element that falls back to initials if the photo 404s. */
    function buildAvatar(player, size) {
        var wrapper = document.createElement("span");
        if (player.imageUrl) {
            var img = document.createElement("img");
            img.className = "avatar";
            img.style.width = size + "px";
            img.style.height = size + "px";
            img.src = player.imageUrl;
            img.alt = player.name;
            img.loading = "lazy";
            img.onerror = function () {
                var fallback = buildInitials(player, size);
                wrapper.replaceChildren(fallback);
            };
            wrapper.appendChild(img);
        } else {
            wrapper.appendChild(buildInitials(player, size));
        }
        return wrapper;
    }

    function buildInitials(player, size) {
        var div = document.createElement("div");
        div.className = "avatar-fallback";
        div.style.width = size + "px";
        div.style.height = size + "px";
        div.style.fontSize = Math.round(size * 0.36) + "px";
        div.textContent = initialsOf(player.name);
        return div;
    }

    function bilingual(en, zh) {
        var span = document.createElement("span");
        span.appendChild(document.createTextNode(en || ""));
        if (zh) {
            var zhSpan = document.createElement("span");
            zhSpan.className = "zh-name";
            zhSpan.textContent = zh;
            span.appendChild(zhSpan);
        }
        return span;
    }

    function bilingualText(en, zh) {
        return zh ? en + "（" + zh + "）" : en || "";
    }

    function renderResults(list) {
        els.results.replaceChildren();
        els.emptyState.hidden = list.length > 0;

        list.forEach(function (p) {
            var li = document.createElement("li");

            var button = document.createElement("button");
            button.type = "button";
            button.className = "result-item";
            button.addEventListener("click", function () {
                openDetail(p);
            });

            var left = document.createElement("span");
            left.className = "result-left";
            left.appendChild(buildAvatar(p, 80));

            var text = document.createElement("span");
            text.className = "result-text";
            var nameLine = document.createElement("div");
            nameLine.className = "result-name";
            nameLine.appendChild(bilingual(p.name, p.nameZh));
            var subLine = document.createElement("div");
            subLine.className = "result-sub";
            subLine.textContent =
                (p.nationalTeam ? bilingualText(p.nationalTeam.name, p.nationalTeam.nameZh) : "—") +
                (p.position ? " · " + p.position : "");
            text.appendChild(nameLine);
            text.appendChild(subLine);
            left.appendChild(text);

            var right = document.createElement("span");
            right.className = "result-right";
            if (p.club) right.textContent = bilingualText(p.club.name, p.club.nameZh);

            button.appendChild(left);
            button.appendChild(right);
            li.appendChild(button);
            els.results.appendChild(li);
        });
    }

    /**
     * Renders a ".value" box that's clickable (a <button>) when `data` is
     * present, or a plain "—" div when it isn't — used for the team/club
     * boxes in the detail modal so tapping the team/club name jumps back to
     * the results list filtered to just that team/club.
     */
    function valueElement(data, textFn, onClick) {
        if (!data) {
            var empty = document.createElement("div");
            empty.className = "value";
            empty.textContent = "—";
            return empty;
        }
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "value value-link";
        btn.textContent = textFn(data);
        btn.addEventListener("click", function () {
            onClick(data);
        });
        return btn;
    }

    function detailRow(label, value) {
        var row = document.createElement("div");
        row.className = "detail-row";
        var k = document.createElement("span");
        k.className = "k";
        k.textContent = label;
        var v = document.createElement("span");
        v.textContent = value;
        row.appendChild(k);
        row.appendChild(v);
        return row;
    }

    function openDetail(p) {
        var content = els.detailContent;
        content.replaceChildren();

        var header = document.createElement("div");
        header.className = "detail-header";
        header.appendChild(buildAvatar(p, 128));
        var h2 = document.createElement("h2");
        h2.appendChild(bilingual(p.name, p.nameZh));
        header.appendChild(h2);
        content.appendChild(header);

        var grid = document.createElement("div");
        grid.className = "detail-grid";

        var teamBox = document.createElement("div");
        teamBox.className = "detail-box";
        teamBox.innerHTML = '<div class="label">世界盃國家隊</div>';
        teamBox.appendChild(
            valueElement(
                p.nationalTeam,
                function (t) {
                    return bilingualText(t.name, t.nameZh);
                },
                function (t) {
                    applyExactFilter(t.name, function (pl) {
                        return pl.nationalTeam && pl.nationalTeam.name === t.name;
                    });
                }
            )
        );
        grid.appendChild(teamBox);

        var clubBox = document.createElement("div");
        clubBox.className = "detail-box";
        clubBox.innerHTML = '<div class="label">目前效力球隊</div>';
        clubBox.appendChild(
            valueElement(
                p.club,
                function (c) {
                    return bilingualText(c.name, c.nameZh);
                },
                function (c) {
                    applyExactFilter(c.name, function (pl) {
                        return pl.club && pl.club.name === c.name;
                    });
                }
            )
        );
        if (p.club && p.club.league) {
            var leagueLine = document.createElement("button");
            leagueLine.type = "button";
            leagueLine.className = "result-sub value-link";
            leagueLine.style.marginTop = "0.25rem";
            leagueLine.textContent = bilingualText(p.club.league, p.club.leagueZh);
            leagueLine.addEventListener("click", function () {
                applyExactFilter(p.club.league, function (pl) {
                    return pl.club && pl.club.league === p.club.league;
                });
            });
            clubBox.appendChild(leagueLine);
        }
        grid.appendChild(clubBox);

        content.appendChild(grid);

        var rows = document.createElement("div");
        rows.className = "detail-rows";
        rows.appendChild(detailRow("位置", p.position || "—"));
        rows.appendChild(detailRow("背號", p.shirtNumber ? "#" + p.shirtNumber : "—"));
        rows.appendChild(detailRow("出生日期", p.dateOfBirth || "—"));
        rows.appendChild(
            detailRow("國家隊出賽 / 進球", p.caps != null ? p.caps + " 場 / " + (p.goals || 0) + " 球" : "—")
        );
        content.appendChild(rows);

        if (p.wikipediaUrl) {
            var link = document.createElement("a");
            link.href = p.wikipediaUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "detail-wiki-link";
            link.textContent = "在 Wikipedia 查看 →";
            content.appendChild(link);
        }

        els.detailOverlay.hidden = false;
    }

    function closeDetail() {
        els.detailOverlay.hidden = true;
    }

    /**
     * Used by the clickable team/club/league values in the detail modal:
     * puts the clicked name in the search box (so it's clear what's being
     * shown) and renders every matching player directly via `matcher` —
     * unlike normal free-text search() this isn't capped at 30, since a
     * league in particular can have well over 30 of this tournament's
     * players in it.
     */
    function applyExactFilter(displayValue, matcher) {
        closeDetail();
        hideLeaguePreview();
        els.search.value = displayValue;
        renderResults(players.filter(matcher));
        els.search.focus();
    }

    /**
     * Default club list shown below the search box while it's empty —
     * clicking a club fills the search box with its name and filters the
     * results to that club, same as clicking a club name in the detail
     * modal.
     */
    var LEAGUE_PREVIEW_NAME = "Premier League";
    var LEAGUE_PREVIEW_LABEL = "英超球隊";

    function leaguePreviewClubs() {
        var seen = {};
        var list = [];
        players.forEach(function (p) {
            if (p.club && p.club.league === LEAGUE_PREVIEW_NAME && !seen[p.club.name]) {
                seen[p.club.name] = true;
                list.push(p.club);
            }
        });
        list.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        return list;
    }

    function renderLeaguePreview() {
        var clubs = leaguePreviewClubs();
        els.leaguePreviewTitle.textContent = LEAGUE_PREVIEW_LABEL;
        els.leaguePreviewList.replaceChildren();
        clubs.forEach(function (c) {
            var chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip";
            chip.textContent = bilingualText(c.name, c.nameZh);
            chip.addEventListener("click", function () {
                applyExactFilter(c.name, function (pl) {
                    return pl.club && pl.club.name === c.name;
                });
            });
            els.leaguePreviewList.appendChild(chip);
        });
        els.leaguePreview.hidden = clubs.length === 0;
    }

    function hideLeaguePreview() {
        els.leaguePreview.hidden = true;
    }

    function showLeaguePreviewIfBuilt() {
        if (els.leaguePreviewList.childElementCount > 0) {
            els.leaguePreview.hidden = false;
        }
    }

    function search(query) {
        var q = query.trim().toLowerCase();
        if (!q) return [];
        return players
            .filter(function (p) {
                return (
                    p.name.toLowerCase().includes(q) ||
                    (p.nameZh && p.nameZh.includes(q)) ||
                    (p.club && p.club.name.toLowerCase().includes(q)) ||
                    (p.club && p.club.nameZh && p.club.nameZh.includes(q)) ||
                    (p.club && p.club.league && p.club.league.toLowerCase().includes(q)) ||
                    (p.club && p.club.leagueZh && p.club.leagueZh.includes(q)) ||
                    (p.nationalTeam && p.nationalTeam.name.toLowerCase().includes(q)) ||
                    (p.nationalTeam && p.nationalTeam.nameZh && p.nationalTeam.nameZh.includes(q))
                );
            })
            .slice(0, 30);
    }

    var debounceTimer = null;
    function onSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            if (!els.search.value.trim()) {
                els.results.replaceChildren();
                els.emptyState.hidden = true;
                showLeaguePreviewIfBuilt();
                return;
            }
            hideLeaguePreview();
            renderResults(search(els.search.value));
        }, 150);
    }

    function init() {
        els.search = document.getElementById("search");
        els.results = document.getElementById("results");
        els.emptyState = document.getElementById("empty-state");
        els.subtitle = document.getElementById("subtitle");
        els.detailOverlay = document.getElementById("detail-overlay");
        els.detailContent = document.getElementById("detail-content");
        els.detailClose = document.getElementById("detail-close");
        els.leaguePreview = document.getElementById("league-preview");
        els.leaguePreviewTitle = document.querySelector(".league-preview-title");
        els.leaguePreviewList = document.getElementById("league-preview-list");

        els.search.addEventListener("input", onSearchInput);
        els.detailClose.addEventListener("click", closeDetail);
        els.detailOverlay.addEventListener("click", function (e) {
            if (e.target === els.detailOverlay) closeDetail();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeDetail();
        });

        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (data) {
                players = data;
                var teamCount = new Set(
                    players.map(function (p) {
                        return p.nationalTeam && p.nationalTeam.name;
                    })
                ).size;
                els.subtitle.textContent = "目前收錄 " + teamCount + " 支 2026 世界盃國家隊，共 " + players.length + " 位球員。";
                renderLeaguePreview();
            })
            .catch(function (err) {
                els.subtitle.textContent = "資料載入失敗，請稍後再試。";
                console.error(err);
            });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
