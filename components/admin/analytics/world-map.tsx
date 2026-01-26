"use client"

import { useMemo } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { scaleLinear } from "d3-scale"

// Use a public topojson file
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

interface WorldMapProps {
    data: { name: string; value: number }[]
}

const WorldMap = ({ data }: WorldMapProps) => {

    // Normalize country names if needed (e.g. USA -> United States of America)
    // For MVP we rely on simple matching or codes.
    // Ideally we'd use ISO codes in the tracker, but names are fine for demo.

    const maxVal = Math.max(...data.map(d => d.value), 1)

    const colorScale = scaleLinear<string>()
        .domain([0, maxVal])
        .range(["#f3f4f6", "#3b82f6"]) // light gray to primary blue

    const getFill = (geoName: string) => {
        const country = data.find(d => {
            // Normalize names for better matching
            const dName = d.name.toLowerCase()
            const gName = geoName.toLowerCase()

            if (dName === gName) return true
            if (dName === "usa" && gName.includes("united states")) return true
            if (dName === "uk" && gName.includes("united kingdom")) return true
            if (dName === "russia" && gName.includes("russian federation")) return true
            if (dName === "south korea" && gName.includes("korea")) return true

            return false
        })
        return country ? "#22c55e" : "#e5e7eb" // Green for active, light gray for inactive
    }

    return (
        <div data-tip="" className="w-full h-full flex items-center justify-center">
            <ComposableMap
                projectionConfig={{ scale: 160, center: [0, 20] }}
                style={{ width: "100%", height: "100%" }}
            >
                <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            const { name } = geo.properties
                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={getFill(name)}
                                    stroke="#D6D6DA"
                                    strokeWidth={0.5}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#F53", outline: "none", transition: "all 250ms" },
                                        pressed: { outline: "none" },
                                    }}
                                />
                            )
                        })
                    }
                </Geographies>
            </ComposableMap>
        </div>
    )
}

export default WorldMap
