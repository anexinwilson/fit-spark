import "@testing-library/jest-dom";
import * as React from "react";

jest.mock("@/features/equipment/actions", () => ({
  __esModule: true,
  getUserEquipment: () => Promise.resolve([]),
  toggleEquipment: () => Promise.resolve({ owned: true }),
}));

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import EquipmentPage from "@/app/equipment/page";
import { EquipmentCard } from "@/components/equipment/equipment-card";
import { EquipmentCatalog } from "@/components/equipment/equipment-catalog";
import type { EquipmentItem } from "@/lib/equipment/types";

const MOCK_EQUIPMENT_RESPONSE = {
  success: true,
  source: "catalog",
  count: 2,
  results: [
    {
      id: "eq-01",
      name: "Lat Pulldown Machine",
      category: "Back",
      level: "beginner",
      equipment_type: "Machine",
      equipment_name: "Lat Pulldown",
      equipment_aliases: ["cable pulldown", "back pulldown"],
      primary_muscles: ["latissimus dorsi", "biceps"],
      secondary_muscles: ["rhomboids"],
      image_urls: ["https://example.com/lat-pulldown.jpg"],
      instructions: [
        "Grasp the bar with a wide overhand grip.",
        "Pull down toward your chest.",
      ],
    },
    {
      id: "eq-02",
      name: "Seated Leg Press",
      category: "Legs",
      level: "intermediate",
      equipment_type: "Machine",
      equipment_name: "Leg Press Machine",
      equipment_aliases: ["sled press"],
      primary_muscles: ["quadriceps", "glutes"],
      secondary_muscles: ["hamstrings"],
      image_urls: [],
      instructions: [
        "Place feet shoulder width apart.",
        "Lower sled to 90 degrees.",
      ],
    },
  ],
};

describe("Equipment Search & Catalog UI", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_EQUIPMENT_RESPONSE,
    } as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders equipment page hero section and catalog title", async () => {
    await act(async () => {
      render(<EquipmentPage />);
    });

    expect(
      screen.getByRole("heading", { name: /Equipment Search & Catalog/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Browse gym machines and free weights/i),
    ).toBeInTheDocument();
  });

  it("fetches and displays equipment items in catalog grid", async () => {
    await act(async () => {
      render(<EquipmentCatalog />);
    });

    await waitFor(() => {
      expect(screen.getByText("Lat Pulldown Machine")).toBeInTheDocument();
      expect(screen.getByText("Seated Leg Press")).toBeInTheDocument();
    });

    expect(screen.getByText("2 Items")).toBeInTheDocument();
  });

  it("updates search query input and triggers fetch", async () => {
    await act(async () => {
      render(<EquipmentCatalog />);
    });

    const searchInput = screen.getByPlaceholderText(
      /Search equipment, muscle group, or category/i,
    );
    fireEvent.change(searchInput, { target: { value: "Lat" } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=Lat"),
      );
    });
  });

  it("filters equipment by muscle group dropdown", async () => {
    await act(async () => {
      render(<EquipmentCatalog />);
    });

    const muscleSelect = screen.getByLabelText(/Filter by muscle group/i);
    fireEvent.change(muscleSelect, { target: { value: "chest" } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("muscle=chest"),
      );
    });
  });

  it("filters equipment by difficulty level dropdown", async () => {
    await act(async () => {
      render(<EquipmentCatalog />);
    });

    const levelSelect = screen.getByLabelText(/Filter by difficulty level/i);
    fireEvent.change(levelSelect, { target: { value: "beginner" } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("level=beginner"),
      );
    });
  });

  it("resets active filters when Reset Filters button is clicked", async () => {
    await act(async () => {
      render(<EquipmentCatalog />);
    });

    const searchInput = screen.getByPlaceholderText(
      /Search equipment, muscle group, or category/i,
    );
    fireEvent.change(searchInput, { target: { value: "chest" } });

    const resetButton = await screen.findByRole("button", {
      name: /Reset Filters/i,
    });
    fireEvent.click(resetButton);

    expect(searchInput).toHaveValue("");
  });

  it("renders empty state card when fetch returns no items", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        source: "catalog",
        count: 0,
        results: [],
      }),
    });

    await act(async () => {
      render(<EquipmentCatalog />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/No equipment matches your search/i),
      ).toBeInTheDocument();
    });
  });

  it("opens details modal dialog when View Details button is clicked", async () => {
    await act(async () => {
      render(<EquipmentCatalog />);
    });

    await waitFor(() => {
      expect(screen.getByText("Lat Pulldown Machine")).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole("button", {
      name: /View Details/i,
    });
    fireEvent.click(viewDetailsButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Lat Pulldown Machine" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Grasp the bar with a wide overhand grip."),
      ).toBeInTheDocument();
    });
  });

  it("EquipmentCard renders target muscles and calls onViewDetails", () => {
    const mockItem: EquipmentItem = MOCK_EQUIPMENT_RESPONSE.results[1];
    const mockViewDetails = jest.fn();

    render(<EquipmentCard item={mockItem} onViewDetails={mockViewDetails} />);

    expect(screen.getByText("Seated Leg Press")).toBeInTheDocument();
    expect(screen.getByText("quadriceps")).toBeInTheDocument();

    const viewDetailsButton = screen.getByRole("button", {
      name: /View Details/i,
    });
    fireEvent.click(viewDetailsButton);
    expect(mockViewDetails).toHaveBeenCalledWith(mockItem);
  });
});
