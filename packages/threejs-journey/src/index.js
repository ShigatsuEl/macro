import { chromium } from "playwright";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import nodeFetch from "node-fetch";
import WebVTT from "webvtt-parser";
import xlsx from "xlsx";

const method = {
    1: macro,
    2: writeXlsx,
};

(() => {
    const number = 2;
    method[number]();
})();

async function macro() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 로그인 페이지로 이동
    await page.goto("https://threejs-journey.com/");

    // 로그인 버튼 클릭
    await page.click(".is-desktop .login-button");

    // 로그인 정보 입력
    await page.fill("#form_email", "minzzang144@gmail.com");
    await page.fill("#form_password", "Shigatsu414!");

    await page.waitForTimeout(100);

    // 로그인
    await page.click(".submit");

    await page.waitForTimeout(1000);

    const trackElement = await page.$$("track");
    const vttUrl = await trackElement[0].getProperty("src");

    const response = await nodeFetch(vttUrl);
    const vttContent = await response.text();

    const parser = new WebVTT.WebVTTParser();
    const tree = parser.parse(vttContent, "metadata");

    const ogTitleContent = await page.$eval(
        'meta[property="og:title"]',
        (element) => element.content
    );

    // XLSX 파일 생성
    const data = []; // Initialize an empty array to hold our data
    for (let cue of tree.cues) {
        const startTime = formatTime(cue.startTime);
        const endTime = formatTime(cue.endTime);
        const row = [`${startTime} --> ${endTime}`, cue.text];
        data.push(row);
    }

    let worksheet = xlsx.utils.aoa_to_sheet(data);
    let workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Subtitles");

    xlsx.writeFile(workbook, `${ogTitleContent}.xlsx`);
    console.log("Done!");
}

function writeXlsx() {
    // VTT 파일의 경로
    const ogTitleContent = "05 — Animations";
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const vttFilePath = path.join(__dirname, `../${ogTitleContent}.vtt`);

    // VTT 파일 읽기
    fs.readFile(vttFilePath, "utf8", (err, vttContent) => {
        if (err) {
            console.error(`Error reading file from disk: ${err}`);
        } else {
            // VTT 데이터 파싱
            const parser = new WebVTT.WebVTTParser();
            const tree = parser.parse(vttContent);

            // XLSX 파일 생성
            const data = []; // Initialize an empty array to hold our data
            for (let cue of tree.cues) {
                const startTime = formatTime(cue.startTime);
                const endTime = formatTime(cue.endTime);
                const row = [`${startTime} --> ${endTime}`, cue.text];
                data.push(row);
            }

            let worksheet = xlsx.utils.aoa_to_sheet(data);
            let workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Subtitles");

            xlsx.writeFile(workbook, `${ogTitleContent}.xlsx`);
        }
    });
    console.log("Done!");
}

function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    let timeString = "";
    if (hours > 0) {
        timeString += `${hours}:`;
    }
    timeString += `${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;

    return timeString;
}

// NOTE: 파파고 API를 사용하려 했으나 무료로 사용할 수 있는 API가 없어서 사용하지 않음
async function translate(text) {
    const response = await fetch("https://openapi.naver.com/v1/papago/n2mt", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
        },
        body: JSON.stringify({
            source: "en",
            target: "ko",
            text: text,
        }),
    });

    const data = await response.json();
    return data.message?.result?.translatedText ?? text;
}
