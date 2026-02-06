console.log('Lets write JavaScript');
let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

const playMusic = (track, pause = false) => {
    try {
        const cleanTrack = track.replace(/\\/g, '/').split('/').pop().trim();
        const cleanPath = `/songs/${currFolder}/${cleanTrack}`;
        console.log(cleanPath);
        currentSong.src = cleanPath;

        if (!pause) {
            currentSong.play()
                .catch((err) => {
                    console.error("Error playing audio:", err);
                    document.querySelector(".songinfo").innerHTML = "Error playing audio";
                });
            const playBtn = document.getElementById('play');
            if (playBtn) playBtn.src = "img/pause.svg";
        }
        document.querySelector(".songinfo").innerHTML = cleanTrack;
        document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
    } catch (err) {
        console.error("Error in playMusic:", err);
        document.querySelector(".songinfo").innerHTML = "Error loading track";
    }
};

async function getSongs(folder) {
    currFolder = folder
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .trim();

    try {
        let a = await fetch(`/songs/${currFolder}/`);
        let response = await a.text();
        let div = document.createElement("div");
        div.innerHTML = response;
        let as = div.getElementsByTagName("a");
        songs = [];

        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith('.mp3')) {
                // Decode any %5C from the URL and normalize it
                let fixedHref = decodeURIComponent(element.href).replace(/\\/g, '/');

                // Also fix cases where %5C got encoded instead of \
                fixedHref = fixedHref.replace(/%5C/gi, '/');

                // Extract the filename only
                const fileName = fixedHref.split('/').pop().trim();
                console.log("Fixed song path:", fixedHref, "=>", fileName);

                songs.push(fileName);
            }
        }


        let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
        songUL.innerHTML = "";
        for (const song of songs) {
            songUL.innerHTML += `<li><img class="invert" width="34" src="img/music.svg" alt="">
                                        <div class="info">
                                            <div> ${song.replaceAll("%20", " ")}</div>
                                            <div>Drake</div>
                                        </div>
                                        <div class="playnow">
                                            <span>Play Now</span>
                                            <img class="invert" src="img/play.svg" alt="">
                                        </div> </li>`;
        }

        Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
            e.addEventListener("click", element => {
                playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
            });
        });

        return songs;
    } catch (error) {
        console.error("Error in getSongs:", error);
        return [];
    }
}

async function displayAlbums() {
    console.log("displaying albums");
    let a = await fetch(`/songs/`);
    let response = await a.text();

    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = ""; // clear any old content

    for (let i = 0; i < anchors.length; i++) {
        let href = decodeURIComponent(anchors[i].href)
            .replace(/\\/g, "/")
            .replace(/%5C/gi, "/");

        // only pick folders inside /songs/
        if (href.includes("/songs/") && !href.match(/\.\w+$/)) {
            // get folder name (last part of the path)
            let parts = href.split("/").filter(Boolean);
            let folder = parts[parts.length - 1];

            console.log("Detected folder:", folder);

            try {
                let infoRes = await fetch(`/songs/${folder}/info.json`);
                if (!infoRes.ok) throw new Error("Missing info.json");
                let info = await infoRes.json();

                cardContainer.innerHTML += `
                            <div data-folder="${folder}" class="card">
                                <div class="play">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                                        <circle cx="32" cy="32" r="26" fill="#1DB954" />
                                        <polygon points="27,21 46,32 27,43" fill="#000000" />
                                    </svg>
                                </div>
                                <img src="/songs/${folder}/cover.jpg" alt="${info.title}">
                                <h2>${info.title}</h2>
                                <p>${info.description}</p>
                            </div>`;
            } catch (err) {
                console.warn(`Skipping ${folder}:`, err);
            }
        }
    }

    // add click listeners to album cards
    Array.from(document.getElementsByClassName("card")).forEach(card => {
        card.addEventListener("click", async e => {
            let folder = e.currentTarget.dataset.folder;
            console.log("Fetching songs from album:", folder);
            songs = await getSongs(folder);
            playMusic(songs[0], true);
        });
    });
}


async function main() {
    await getSongs("ncs");
    playMusic(songs[0], true);

    await displayAlbums();

    const playBtn = document.getElementById('play');
    const previousBtn = document.getElementById('previous');
    const nextBtn = document.getElementById('next');

    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play().catch(() => { });
                playBtn.src = "img/pause.svg";
            } else {
                currentSong.pause();
                playBtn.src = "img/play.svg";
            }
        });
    }

    currentSong.addEventListener("timeupdate", () => {
        const curr = secondsToMinutesSeconds(currentSong.currentTime);
        const dur = secondsToMinutesSeconds(currentSong.duration);
        document.querySelector(".songtime").innerHTML = `${curr} / ${isNaN(currentSong.duration) ? "00:00" : dur}`;
        if (currentSong.duration && !isNaN(currentSong.duration) && currentSong.duration > 0) {
            const percent = (currentSong.currentTime / currentSong.duration) * 100;
            document.querySelector(".circle").style.left = percent + "%";
        }
    });

    const seekbar = document.querySelector(".seekbar");
    if (seekbar) {
        seekbar.addEventListener("click", e => {
            const rect = seekbar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, clickX / rect.width)) * 100;
            document.querySelector(".circle").style.left = percent + "%";
            if (currentSong.duration && !isNaN(currentSong.duration)) {
                currentSong.currentTime = ((currentSong.duration) * percent) / 100;
            }
        });
    }

    const volumeInput = document.querySelector(".range").getElementsByTagName("input")[0];
    if (volumeInput) {
        volumeInput.addEventListener("change", (e) => {
            currentSong.volume = parseInt(e.target.value) / 100;
            const volImg = document.querySelector(".volume>img");
            if (currentSong.volume > 0 && volImg) {
                volImg.src = volImg.src.replace("mute.svg", "volume.svg");
            }
        });
    }

    const volImg = document.querySelector(".volume>img");
    if (volImg) {
        volImg.addEventListener("click", e => {
            if (e.target.src.includes("volume.svg")) {
                e.target.src = e.target.src.replace("volume.svg", "mute.svg");
                currentSong.volume = 0;
                if (volumeInput) volumeInput.value = 0;
            } else {
                e.target.src = e.target.src.replace("mute.svg", "volume.svg");
                currentSong.volume = .10;
                if (volumeInput) volumeInput.value = 10;
            }
        });
    }

    const hamburger = document.querySelector(".hamburger");
    if (hamburger) hamburger.addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });
    const closeBtn = document.querySelector(".close");
    if (closeBtn) closeBtn.addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    if (previousBtn) {
        previousBtn.addEventListener("click", () => {
            currentSong.pause();
            let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").slice(-1)[0]));
            if ((index - 1) >= 0) {
                playMusic(songs[index - 1]);
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            currentSong.pause();
            let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").slice(-1)[0]));
            if ((index + 1) < songs.length) {
                playMusic(songs[index + 1]);
            }
        });
    }
}

main();