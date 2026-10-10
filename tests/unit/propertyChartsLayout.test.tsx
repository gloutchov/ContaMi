import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TrendBars } from "../../src/renderer/components/TrendBars";

afterEach(cleanup);

describe("property compact chart layout", () => {
  it("keeps every year label rendered as the chart x-axis", () => {
    const { container } = render(<TrendBars points={Array.from({ length: 14 }, (_, index) => ({ year: 2014 + index, value: index * 100 + 10 }))} format={(value) => `${value}`} />);

    expect(screen.getByText("2014")).toBeInTheDocument();
    expect(screen.getByText("2027")).toBeInTheDocument();
    expect(container.querySelectorAll("svg.trend-track")).toHaveLength(14);
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("reserves vertical space for labels while allowing horizontal scrolling only", () => {
    const css = readFileSync(path.join(process.cwd(), "src/renderer/linked-workflows.css"), "utf8");

    expect(css).toContain(".utility-cost-charts { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }");
    expect(css).toContain(".trend-bars { height: 196px;");
    expect(css).toContain("overflow-x: auto;");
    expect(css).toContain("overflow-y: visible;");
    expect(css).toContain("padding: 4px 0 22px;");
    expect(css).toContain("grid-template-rows: 24px 122px 22px;");
    expect(css).toContain(".trend-track { width: 100%; height: 122px;");
    expect(css).toContain(".trend-fill { vector-effect: non-scaling-stroke;");
    expect(css).toContain("animation: financial-chart-grow-y 720ms");
    expect(css).toContain("@keyframes financial-chart-grow-y");
  });
});


describe("vehicle cost comparison bars", () => {
  it("renders a labelled zero-cost comparison without inventing a positive bar", () => {
    const { container } = render(<TrendBars variant="costComparison" points={[{ label: "Synthetic free car", value: 0 }]} format={String} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Synthetic free car: 0");
    expect(container.querySelector("rect")).toHaveAttribute("height", "0");
  });

  it("uses rectangular columns, tied extrema colours and proportional heights", () => {
    const { container } = render(<TrendBars variant="costComparison" points={[0.2, 0.5, 0.8, 0.2, 0.8].map((value, index) => ({ label: `Car ${index}`, value }))} format={String} />);
    const bars = [...container.querySelectorAll("rect")];
    expect(bars.map((bar) => bar.getAttribute("rx"))).toEqual(["0", "0", "0", "0", "0"]);
    expect(bars.map((bar) => bar.getAttribute("height"))).toEqual(["25", "62.5", "100", "25", "100"]);
    expect(container.querySelectorAll(".trend-cost-economical")).toHaveLength(2);
    expect(container.querySelectorAll(".trend-cost-moderate")).toHaveLength(1);
    expect(container.querySelectorAll(".trend-cost-expensive")).toHaveLength(2);
    expect(screen.getByRole("img")).toHaveAccessibleName("Car 0: 0.2; Car 1: 0.5; Car 2: 0.8; Car 3: 0.2; Car 4: 0.8");
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it.each([[0.5], [0.5, 0.5]])("shows equal costs as economical (%j)", (...values) => {
    const { container } = render(<TrendBars variant="costComparison" points={values.map((value, index) => ({ label: `Car ${index}`, value }))} format={String} />);
    expect(container.querySelectorAll(".trend-cost-economical")).toHaveLength(values.length);
    expect(container.querySelectorAll(".trend-cost-expensive")).toHaveLength(0);
  });
});
