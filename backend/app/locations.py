"""Popular running locations grouped by Singapore region."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Location:
    id: str
    name: str
    region: str
    lat: float
    lng: float
    description: str


POPULAR_LOCATIONS: tuple[Location, ...] = (
    Location("marina-bay", "Marina Bay Sands", "Central", 1.2834, 103.8607, "Iconic waterfront promenade"),
    Location("gardens-bay", "Gardens by the Bay", "Central", 1.2816, 103.8636, "Scenic garden paths"),
    Location("fort-canning", "Fort Canning Park", "Central", 1.2966, 103.8466, "Shaded hilltop trails"),
    Location("clarke-quay", "Clarke Quay", "Central", 1.2905, 103.8465, "Riverside city running"),
    Location("macritchie", "MacRitchie Reservoir", "Central", 1.3475, 103.8350, "Forest reservoir loop"),
    Location("east-coast-lagoon", "East Coast Park Lagoon", "East Coast", 1.3050, 103.9350, "Sea breeze boardwalk"),
    Location("katong-park", "Katong Park", "East Coast", 1.2970, 103.8820, "Coastal neighbourhood run"),
    Location("bedok-reservoir", "Bedok Reservoir", "East Coast", 1.3401, 103.9345, "Flat reservoir loop"),
    Location("pasir-ris", "Pasir Ris Park", "East Coast", 1.3760, 103.9550, "Mangrove boardwalk"),
    Location("jurong-lake", "Jurong Lake Gardens", "West", 1.3354, 103.7265, "Wide lakeside paths"),
    Location("chinese-garden", "Chinese Garden", "West", 1.3387, 103.7317, "Pagoda and lake views"),
    Location("bukit-batok", "Bukit Batok Nature Park", "West", 1.3523, 103.7769, "Hilly nature trails"),
    Location("west-coast", "West Coast Park", "West", 1.2915, 103.7615, "Quiet coastal stretch"),
    Location("woodlands", "Woodlands Waterfront", "North", 1.4560, 103.7724, "Northern waterfront"),
    Location("admiralty", "Admiralty Park", "North", 1.4511, 103.7782, "Adventure playground trails"),
    Location("punggol", "Punggol Waterway", "North", 1.4131, 103.9094, "Waterway park loop"),
)

REGIONS = ("Any", "Central", "East Coast", "West", "North")


def locations_for_region(region: str) -> list[Location]:
    if region == "Any":
        return list(POPULAR_LOCATIONS)
    return [location for location in POPULAR_LOCATIONS if location.region == region]
