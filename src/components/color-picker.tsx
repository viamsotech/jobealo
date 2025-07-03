"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette } from "lucide-react"

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const colors = [
  "#4F46E5", // Blue
  "#7C3AED", // Light Blue
  "#10B981", // Green
  "#6EE7B7", // Light Green
  "#EF4444", // Red
  "#F87171", // Light Red/Pink
  "#EC4899", // Pink/Magenta
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#FBBF24", // Light Orange
  "#1E293B", // Dark Navy
  "#000000", // Black
]

export function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-transparent">
          <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: selectedColor }} />
          <Palette className="w-4 h-4" />
          <span>Color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Personaliza el color de los encabezados</h4>
          <div className="grid grid-cols-6 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  selectedColor === color
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
