import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const baseURL = "http://127.0.0.1:4174";

async function openLanding(
  browser: Browser,
  options: { locale: string; colorScheme: "light" | "dark"; width?: number; height?: number },
): Promise<{ context: BrowserContext; page: Page; consoleErrors: string[]; remoteRequests: string[] }> {
  const context = await browser.newContext({
    baseURL,
    locale: options.locale,
    colorScheme: options.colorScheme,
    reducedMotion: "reduce",
    viewport: { width: options.width ?? 1_080, height: options.height ?? 800 },
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const remoteRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== baseURL) remoteRequests.push(request.url());
  });
  await page.goto("/Contami/");
  await expect(page.locator("html")).toHaveAttribute("lang", options.locale.startsWith("it") ? "it" : "en");
  return { context, page, consoleErrors, remoteRequests };
}

test("landing detects non-Italian locales and exposes the main conversion path", async ({ browser }) => {
  const { context, page, consoleErrors, remoteRequests } = await openLanding(browser, { locale: "de-DE", colorScheme: "light" });

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your finances");
  await expect(page.getByRole("link", { name: "Download latest release" }).first()).toHaveAttribute(
    "href",
    "https://github.com/gloutchov/Contami/releases/latest",
  );
  await expect(page.getByRole("link", { name: "View on GitHub" }).first()).toHaveAttribute("href", "https://github.com/gloutchov/Contami");
  const homeLink = page.getByRole("link", { name: "Glauco Silvestri homepage" });
  await expect(homeLink).toHaveAttribute("href", "https://glaucosilvestri.it/");
  const [homeBounds, headerBounds] = await Promise.all([
    homeLink.evaluate((element) => element.getBoundingClientRect().toJSON()),
    page.locator(".header-inner").evaluate((element) => element.getBoundingClientRect().toJSON()),
  ]);
  expect(homeBounds.left).toBeGreaterThan(headerBounds.left + headerBounds.width / 2);
  expect(homeBounds.right).toBeLessThanOrEqual(headerBounds.right);
  await expect(page.getByRole("link", { name: "Read the user guide" }).first()).toHaveAttribute(
    "href",
    "https://github.com/gloutchov/Contami/blob/main/INSTRUCTIONS.md",
  );
  await expect(page.locator("#hero-image")).toHaveAttribute("src", /panoramica_whi_english\.png$/);
  expect(consoleErrors).toEqual([]);
  expect(remoteRequests).toEqual([]);
  await context.close();
});

test("landing detects Italian, follows dark mode, and loads localized media", async ({ browser }) => {
  const { context, page, consoleErrors, remoteRequests } = await openLanding(browser, { locale: "it-IT", colorScheme: "dark" });

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le tue finanze");
  await expect(page.locator("#hero-image")).toHaveAttribute("src", /panoramica_blk\.png$/);
  await expect(page.locator('video[data-media-key="transazioni"]')).toHaveAttribute("src", /transazioni\.mp4$/);
  await expect(page.locator('video[data-media-key="transazioni"]')).toHaveAttribute("poster", /transazioni_blk\.png$/);
  await expect(page.getByRole("link", { name: "Leggi le istruzioni" }).first()).toHaveAttribute(
    "href",
    "https://github.com/gloutchov/Contami/blob/main/ISTRUZIONI.md",
  );
  await expect(page.getByRole("link", { name: "Sito principale di Glauco Silvestri" })).toHaveAttribute(
    "href",
    "https://glaucosilvestri.it/",
  );
  expect(consoleErrors).toEqual([]);
  expect(remoteRequests).toEqual([]);
  await context.close();
});

test("local demonstrations play and starting another pauses the previous one", async ({ browser }) => {
  const { context, page, consoleErrors, remoteRequests } = await openLanding(browser, { locale: "en-US", colorScheme: "light" });
  const overview = page.locator('video[data-media-key="panoramica"]');
  const transactions = page.locator('video[data-media-key="transazioni"]');

  await overview.evaluate((video: HTMLVideoElement) => video.play());
  await expect.poll(() => overview.evaluate((video: HTMLVideoElement) => video.paused)).toBe(false);
  await transactions.evaluate((video: HTMLVideoElement) => video.play());
  await expect.poll(() => overview.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  await expect.poll(() => transactions.evaluate((video: HTMLVideoElement) => video.paused)).toBe(false);
  await transactions.evaluate((video: HTMLVideoElement) => video.pause());

  expect(consoleErrors).toEqual([]);
  expect(remoteRequests).toEqual([]);
  await context.close();
});

test("manual language choice persists and keeps dictionaries equivalent", async ({ browser }) => {
  const { context, page } = await openLanding(browser, { locale: "en-US", colorScheme: "light" });

  await page.getByRole("button", { name: "IT" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le tue finanze");
  await expect(page.getByRole("link", { name: "Sito principale di Glauco Silvestri" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leggi le istruzioni" }).first()).toHaveAttribute("href", /ISTRUZIONI\.md$/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.getByRole("link", { name: "Leggi le istruzioni" }).first()).toHaveAttribute("href", /ISTRUZIONI\.md$/);

  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Read the user guide" }).first()).toHaveAttribute("href", /INSTRUCTIONS\.md$/);
  await expect(page.getByRole("link", { name: "Glauco Silvestri homepage" })).toBeVisible();
  await context.close();
});

test("direct local-file preview shows the content and supports language switching", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", colorScheme: "light", reducedMotion: "no-preference" });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(pathToFileURL(path.resolve("docs/index.html")).href);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your finances");
  await expect(page.locator(".hero-copy")).toBeVisible();

  await page.getByRole("button", { name: "IT" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le tue finanze");
  expect(consoleErrors).toEqual([]);
  await context.close();
});

test("media previews crop the captured desktop chrome without changing the assets", async ({ browser }) => {
  const { context, page, consoleErrors } = await openLanding(browser, { locale: "en-US", colorScheme: "light" });
  const heroFrame = page.locator(".app-window");
  const heroImage = page.locator("#hero-image");
  const heroMedia = page.locator(".hero-media");
  const featureVideo = page.locator('video[data-media-key="panoramica"]');

  await expect(page.locator(".window-bar")).toHaveCount(0);
  const [heroRatio, heroStyles, videoStyles] = await Promise.all([
    heroFrame.evaluate((element) => {
      return element.clientWidth / element.clientHeight;
    }),
    heroImage.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { fit: styles.objectFit, position: styles.objectPosition };
    }),
    featureVideo.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return { ratio: bounds.width / bounds.height, fit: styles.objectFit, position: styles.objectPosition };
    }),
  ]);

  expect(heroRatio).toBeCloseTo(1280 / 752, 2);
  expect(heroStyles).toEqual({ fit: "cover", position: "50% 100%" });
  expect(videoStyles.ratio).toBeCloseTo(1280 / 752, 2);
  expect(videoStyles).toMatchObject({ fit: "cover", position: "50% 100%" });
  const heroComposition = await Promise.all([
    page.getByRole("heading", { level: 1 }).evaluate((element) => element.getBoundingClientRect().toJSON()),
    heroFrame.evaluate((element) => element.getBoundingClientRect().toJSON()),
    heroMedia.evaluate((element) => getComputedStyle(element).transform),
  ]);
  expect(Math.abs(heroComposition[0].top - heroComposition[1].top)).toBeLessThan(100);
  expect(heroComposition[1].height).toBeGreaterThan(heroComposition[0].height * 0.85);
  expect(heroComposition[2]).not.toBe("none");
  const heroFooter = page.locator(".hero-footer");
  const heroActions = heroFooter.locator(".hero-actions a");
  await expect(heroActions).toHaveText(["Download latest release", "Read the user guide", "View on GitHub"]);
  const heroFooterLayout = await heroFooter.evaluate((element) => {
    const facts = element.querySelector(".hero-facts")?.getBoundingClientRect();
    const actions = element.querySelector(".hero-actions")?.getBoundingClientRect();
    const buttons = [...element.querySelectorAll(".hero-actions a")].map((button) => button.getBoundingClientRect());
    return {
      display: getComputedStyle(element).display,
      factsRight: facts?.right ?? Number.POSITIVE_INFINITY,
      actionsLeft: actions?.left ?? Number.NEGATIVE_INFINITY,
      buttonTops: buttons.map((button) => Math.round(button.top)),
      buttonLefts: buttons.map((button) => button.left),
      buttonRights: buttons.map((button) => button.right),
    };
  });
  expect(heroFooterLayout.display).toBe("grid");
  expect(heroFooterLayout.factsRight).toBeLessThan(heroFooterLayout.actionsLeft);
  expect(new Set(heroFooterLayout.buttonTops).size).toBe(1);
  expect(heroFooterLayout.buttonRights[0]).toBeLessThan(heroFooterLayout.buttonLefts[1]);
  expect(heroFooterLayout.buttonRights[1]).toBeLessThan(heroFooterLayout.buttonLefts[2]);
  const desktopWidth = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(desktopWidth.scrollWidth).toBeLessThanOrEqual(desktopWidth.clientWidth);
  await page.setViewportSize({ width: 1_536, height: 1_024 });
  const wideLayout = await page.evaluate(() => {
    const frame = document.querySelector(".app-window")?.getBoundingClientRect();
    return {
      frameRight: frame?.right ?? Number.POSITIVE_INFINITY,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  expect(wideLayout.frameRight).toBeLessThan(wideLayout.clientWidth);
  expect(wideLayout.scrollWidth).toBeLessThanOrEqual(wideLayout.clientWidth);
  expect(consoleErrors).toEqual([]);
  await context.close();
});

test("landing remains keyboard-usable and free of horizontal overflow on mobile", async ({ browser }) => {
  const { context, page, consoleErrors, remoteRequests } = await openLanding(browser, {
    locale: "it-IT",
    colorScheme: "light",
    width: 390,
    height: 844,
  });

  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeInViewport();
  const homeLink = page.getByRole("link", { name: "Sito principale di Glauco Silvestri" });
  await expect(homeLink).toBeVisible();
  await homeLink.focus();
  await expect(homeLink).toBeFocused();
  const headerActionsBounds = await page.locator(".header-actions").evaluate((element) => element.getBoundingClientRect().toJSON());
  expect(headerActionsBounds.right).toBeLessThanOrEqual(390);
  await expect(page.locator(".feature-chapter")).toHaveCount(9);
  expect(consoleErrors).toEqual([]);
  expect(remoteRequests).toEqual([]);
  await context.close();
});
