import "@testing-library/jest-dom";
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";

jest.mock("@/lib/auth", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue("test_user_id"),
}));

import { EquipmentCatalog } from "@/components/equipment/equipment-catalog";
import { EquipmentDetailsDialog } from "@/components/equipment/equipment-details-dialog";
import type { EquipmentItem } from "@/lib/equipment/types";

const MOCK_ITEMS: EquipmentItem[] = [
  {
    id: "eq-1",
    name: "Barbell Bench Press",
    category: "Chest",
    level: "intermediate",
    equipment_type: "Barbell",
    equipment_name: "Olympic Barbell & Flat Bench",
    equipment_aliases: ["flat bench", "chest press"],
    primary_muscles: ["pectoralis major"],
    secondary_muscles: ["triceps", "deltoids"],
    image_urls: ["https://example.com/bench-press.jpg"],
    instructions: ["Lie flat on bench.", "Lower bar to chest.", "Push up."],
  },
  {
    id: "eq-2",
    name: "Cable Lat Pulldown",
    category: "Back",
    level: "beginner",
    equipment_type: "Machine",
    equipment_name: "Lat Pulldown Station",
    equipment_aliases: ["cable pull"],
    primary_muscles: ["latissimus dorsi"],
    secondary_muscles: ["biceps"],
    image_urls: [], // No image
    instructions: ["Sit at machine.", "Pull bar to upper chest."],
  },
  {
    id: "eq-3",
    name: "Broken Image Squat Rack",
    category: "Legs",
    level: "advanced",
    equipment_type: "Rack",
    equipment_name: "Power Cage",
    equipment_aliases: ["squat cage"],
    primary_muscles: ["quadriceps", "glutes"],
    secondary_muscles: ["hamstrings"],
    image_urls: ["https://invalid-domain-xyz.com/broken-img.jpg"],
    instructions: ["Step under bar.", "Squat deep."],
  },
];

describe("M2 Equipment UI Stress & Edge Case Test Suite", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      const urlObj = new URL(url, "http://localhost");
      const q = urlObj.searchParams.get("q") || "";
      const muscle = urlObj.searchParams.get("muscle") || "";
      const level = urlObj.searchParams.get("level") || "";
      const category = urlObj.searchParams.get("category") || "";

      let filtered = [...MOCK_ITEMS];
      if (q.trim()) {
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().includes(q.trim().toLowerCase()),
        );
      }
      if (muscle && muscle !== "all") {
        filtered = filtered.filter(
          (item) =>
            item.primary_muscles.includes(muscle) ||
            item.secondary_muscles.includes(muscle),
        );
      }
      if (level && level !== "all") {
        filtered = filtered.filter((item) => item.level === level);
      }
      if (category && category !== "all") {
        filtered = filtered.filter((item) => item.category === category);
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          source: "fallback",
          count: filtered.length,
          results: filtered,
        }),
      } as Response;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  describe("1. Search Query Debouncing, Empty Query, Whitespace, Special Characters", () => {
    it("debounces rapid keystrokes with 250ms delay", async () => {
      render(<EquipmentCatalog />);

      // Fast forward past initial load
      act(() => {
        jest.advanceTimersByTime(300);
      });

      const searchInput = screen.getByPlaceholderText(/Search equipment/i);

      // Type 3 characters in quick succession
      fireEvent.change(searchInput, { target: { value: "B" } });
      fireEvent.change(searchInput, { target: { value: "Ba" } });
      fireEvent.change(searchInput, { target: { value: "Bar" } });

      // Before 250ms, fetch should not have been called for "Bar"
      const callsBefore = (global.fetch as jest.Mock).mock.calls.length;

      // Advance by 100ms
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Still no new call
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsBefore);

      // Advance remaining 150ms
      await act(async () => {
        jest.advanceTimersByTime(160);
      });

      // Fetch should be called with q=Bar
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("q=Bar"),
      );
    });

    it("handles whitespace-only queries by omitting q param from fetch", async () => {
      render(<EquipmentCatalog />);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const searchInput = screen.getByPlaceholderText(/Search equipment/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "   \t  " } });
        jest.advanceTimersByTime(300);
      });

      const lastCallUrl = (global.fetch as jest.Mock).mock.calls.slice(-1)[0][0];
      expect(lastCallUrl).not.toContain("q=");
    });

    it("safely encodes special characters, HTML, and SQL payloads in search query", async () => {
      render(<EquipmentCatalog />);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const searchInput = screen.getByPlaceholderText(/Search equipment/i);
      const specialQuery = "<script>alert('xss')</script> & ' OR 1=1 -- 🏋️‍♂️";

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: specialQuery } });
        jest.advanceTimersByTime(300);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=%3Cscript%3Ealert"),
      );
    });
  });

  describe("2. Filtering by Muscle, Level, Category, and Reset Filters Button", () => {
    it("applies muscle, category, and level filters together", async () => {
      render(<EquipmentCatalog />);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const muscleSelect = screen.getByLabelText(/Filter by muscle group/i);
      const categorySelect = screen.getByLabelText(/Filter by category/i);
      const levelSelect = screen.getByLabelText(/Filter by difficulty level/i);

      await act(async () => {
        fireEvent.change(muscleSelect, { target: { value: "chest" } });
        fireEvent.change(categorySelect, { target: { value: "Free Weights" } });
        fireEvent.change(levelSelect, { target: { value: "intermediate" } });
        jest.advanceTimersByTime(300);
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("muscle=chest"),
      );
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("category=Free+Weights"),
      );
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("level=intermediate"),
      );
    });

    it("resets all active filters when Reset Filters button is clicked", async () => {
      render(<EquipmentCatalog />);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const searchInput = screen.getByPlaceholderText(/Search equipment, muscle group, or category.../i);
      const muscleSelect = screen.getByLabelText(/Filter by muscle group/i);
      const categorySelect = screen.getByLabelText(/Filter by category/i);
      const levelSelect = screen.getByLabelText(/Filter by difficulty level/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "bench" } });
        fireEvent.change(muscleSelect, { target: { value: "biceps" } });
        fireEvent.change(categorySelect, { target: { value: "Back" } });
        fireEvent.change(levelSelect, { target: { value: "beginner" } });
        jest.advanceTimersByTime(300);
      });

      const resetButton = screen.getByRole("button", { name: /Reset Filters/i });
      expect(resetButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(resetButton);
        jest.advanceTimersByTime(300);
      });

      expect(searchInput).toHaveValue("");
      expect(muscleSelect).toHaveValue("all");
      expect(categorySelect).toHaveValue("all");
      expect(levelSelect).toHaveValue("all");
    });
  });

  describe("3. Dialog Opening, Closing, and Image Fallback Handling", () => {
    it("handles image error fallback gracefully on EquipmentDetailsDialog", async () => {
      const mockItem = MOCK_ITEMS[2]; // Broken image item
      const handleOpenChange = jest.fn();

      render(
        <EquipmentDetailsDialog
          equipment={mockItem}
          open={true}
          onOpenChange={handleOpenChange}
        />,
      );

      const img = screen.getByAltText("Broken Image Squat Rack");
      expect(img).toBeInTheDocument();

      // Trigger onError
      fireEvent.error(img);

      // Image should be hidden after error
      expect(screen.queryByAltText("Broken Image Squat Rack")).not.toBeInTheDocument();
    });

    it("opens and closes EquipmentDetailsDialog properly", async () => {
      const mockItem = MOCK_ITEMS[0];
      const handleOpenChange = jest.fn();

      const { rerender } = render(
        <EquipmentDetailsDialog
          equipment={mockItem}
          open={true}
          onOpenChange={handleOpenChange}
        />,
      );

      expect(
        screen.getByRole("heading", { name: "Barbell Bench Press" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Machine / Equipment: Olympic Barbell & Flat Bench")).toBeInTheDocument();
      expect(screen.getByText("Execution Instructions")).toBeInTheDocument();

      const closeButtons = screen.getAllByRole("button", { name: /Close/i });
      fireEvent.click(closeButtons[0]);
      expect(handleOpenChange).toHaveBeenCalledWith(false);

      // When open=false, rerender
      rerender(
        <EquipmentDetailsDialog
          equipment={mockItem}
          open={false}
          onOpenChange={handleOpenChange}
        />,
      );

      expect(
        screen.queryByRole("heading", { name: "Barbell Bench Press" }),
      ).not.toBeInTheDocument();
    });

    it("renders image fallback in EquipmentDetailsDialog when equipment has no image URLs", async () => {
      const noImageItem = MOCK_ITEMS[1];

      render(
        <EquipmentDetailsDialog
          equipment={noImageItem}
          open={true}
          onOpenChange={jest.fn()}
        />,
      );

      expect(
        screen.getByRole("heading", { name: "Cable Lat Pulldown" }),
      ).toBeInTheDocument();
      // No <img> tag should be rendered
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });
});
