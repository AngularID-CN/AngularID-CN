/**
 * 用于自动生成 TODO.md 所需的 markdown 文本
 * @param {number} offset 序号的偏移量
 * ---
 * 使用方法（以生成包含 #Angular# 标签的文章为例）：
 * 1. 打开 TODO.md ，在 Angular 小节下随便找一篇文章，例如可以找到最新的文章（记作文章 A）
 * 2. 打开 https://blog.angularindepth.com/tagged/angular 的文章列表，下拉找到对应的文章 A
 * 3. 打开控制台并粘贴和执行下述代码，调整 offset 参数直到 markdown 文本中文章 A 的序号和 TODO.md 中文章 A 的序号一致
 * 4. 复制粘贴所需 markdown 文本，添加到 TODO.md 适当位置即可～
 */
function genMD(offset) {
    offset = offset || 0;
    const main = document.querySelector('.js-tagStream');
    const articleList = [...main.querySelectorAll('.postArticle')];
    const numOfArticles = articleList.length;
    const dataList = articleList.map((article, i) => {
        const content = article.querySelector('.postArticle-content');
        const title = article.querySelector('.section-inner').querySelector('h3').innerText;
        const link = content.parentElement.href;

        return ({
            title,
            link,
            index: numOfArticles - i
        });
    });
    const markdown = dataList.reduce((acc, { title, link, index }) => {
        return (acc += `${index + offset} | [${title}](${link}) | - |  |  |  |  |\n`);
    }, 'No. | 原文 | 转载 | 译者 | 校对 | 进度 | 译文\n :-: | :- | :-: | :-: | :- | :-: | :- \n');
    return markdown;
}
genMD();