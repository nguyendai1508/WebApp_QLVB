document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnOpenWebApp').addEventListener('click', () => {
        chrome.tabs.create({ url: "https://qlvbpr.io.vn/" });
    });
});
