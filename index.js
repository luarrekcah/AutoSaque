/**
 * @author - Github: @luarrekcah
 */

const puppeteer = require("puppeteer");
const axios = require("axios");

const vars = {
  email: "seu_email",
  senha: "sua_senha",
  cpf: "opcional",
  titular: "opcional",
  wpp: "opcional",
  addInfos: false, // coloque como true caso você queira que o bot preencha os dados de saque.
  saqueMinimo: 50,
  chaveapi: "", // Colocar a sua chave api do capsolver.com
  site: "https://betbcr.com/#/home",
};

/**
 * NÃO ALTERE O CÓDIGO ABAIXO SEM CONHECIMENTO
 */

const start = async () => {
  const browser = await puppeteer.launch({
    headless: "new", // mude para false se você quer que apareça o navegador.
  });

  const page = await browser.newPage();

  await page.goto(vars.site, { timeout: 60000 });

  await page.waitForSelector(".headerBox-loginBut");
  await page.click(".headerBox-loginBut");

  await page.waitForSelector(".loginPage-emailBox input");
  await page.type(".loginPage-emailBox input", vars.email);
  await page.type('.van-field__control[type="password"]', vars.senha);

  let text = "";
  let validSolution = false;

  while (!validSolution) {
    await page.click(".codeImg img");

    await page.waitForTimeout(3000);

    const captchaElement = await page.$(".codeImg img");
    const base64CaptchaImage = await captchaElement.screenshot({
      encoding: "base64",
    });

    if (!base64CaptchaImage || base64CaptchaImage === "") {
      console.error("Erro ao capturar a imagem do captcha.");
      break;
    }

    const captchaTask = {
      clientKey: vars.chaveapi,
      task: {
        type: "ImageToTextTask",
        module: "common",
        body: base64CaptchaImage,
      },
    };

    const response = await axios.post(
      "https://api.capsolver.com/createTask",
      captchaTask,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    text = response.data.solution.text;
    validSolution = /^\d+$/.test(text);

    if (!validSolution) {
      console.log("Solução inválida, recapturando o captcha.");
    }
  }

  if (validSolution) {
    console.log("Solução válida:", text);

    await page.type('.van-field__control[name="captCode"]', text);

    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });

    await page.waitForTimeout(5000);

    await page.waitForSelector('.buttonLine button[type="submit"]');

    await page.evaluate(() => {
      const buttonLineElement = document.querySelector(".buttonLine");
      if (buttonLineElement) {
        buttonLineElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });

    await page.waitForSelector('.buttonLine button[type="submit"]');

    await page.click('.buttonLine button[type="submit"]');
    await page.click('.buttonLine button[type="submit"]');

    await page.waitForTimeout(5000);

    await page.waitForSelector(".headerBox-wallet");
    await page.click(".headerBox-wallet");

    const elements = await page.$$("div.butItem");
    for (const element of elements) {
      const text = await element.evaluate((node) => node.textContent);
      if (text.includes("Retirar")) {
        await element.click();
        break;
      }
    }

    await page.waitForTimeout(5000);

    await page.waitForSelector(".withdrawPage-explain-title");

    // Coleta o valor disponível
    const valorDisponivel = await page.$eval(".fieldLabel2", (element) =>
      element.textContent.trim()
    );

    const valorNumericoString = valorDisponivel.replace(/[^\d.,]/g, "");

    const valorNumerico = parseFloat(valorNumericoString.replace(",", "."));

    if (valorNumerico < vars.saqueMinimo) {
      console.log("Valor mínimo de saque não atingido");

      await browser.close();
    }

    await page.waitForSelector(".van-overlay");

    await page.waitForSelector(
      ".van-cell input[type='text'][inputmode='decimal']"
    );

    // Insira o valor disponível no campo de valor de saque

    await page.evaluate(() => {
      const inputElement = document.querySelector(
        ".van-cell input[type='text'][inputmode='decimal']"
      );
      if (inputElement) {
        inputElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });

    await page.evaluate((valorNumerico) => {
      const inputElement = document.querySelector(
        ".van-cell input[type='text'][inputmode='decimal']"
      );
      inputElement.value = valorNumerico;
      inputElement.dispatchEvent(new Event("input"));
    }, valorNumerico);

    if (vars.addInfos) {
      await page.waitForSelector(".typLine box_row.align_center");
      await page.click(".typLine box_row.align_center");

      await page.type("#van-field-15-input", vars.cpf);
      await page.type("#van-field-13-input", vars.titular);
      await page.type("#van-field-13-input", vars.wpp);

      await page.waitForSelector("line3");
      await page.click("line3");
    }

    // Sacar
    await page.waitForSelector(".withdrawPage-subimtBut > div");
    await page.click(".withdrawPage-subimtBut > div");

    await page.waitForTimeout(5000);

    await browser.close();
  } else {
    // Feche o navegador em caso de erro na solução do captcha
    console.error("Erro na solução do captcha. Fechando o navegador.");
    await browser.close();
  }
};

start();