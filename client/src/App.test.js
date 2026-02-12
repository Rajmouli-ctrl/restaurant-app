import { render, screen, waitFor } from "@testing-library/react";

jest.mock(
  "@vercel/speed-insights/react",
  () => ({
    SpeedInsights: () => null
  }),
  { virtual: true }
);

import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test("renders app title and requests menu", async () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: "NOIRZA" })
  ).toBeInTheDocument();

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/menu")
    );
  });
});
