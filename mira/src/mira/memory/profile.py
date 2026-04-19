import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class PersonProfile:
    name: str
    age: int
    condition: str
    key_people: list[str]
    favourite_topics: list[str]
    photos: dict[str, str]          # filename → description
    default_face: str = "calm"
    default_led: str = "warm"
    greeting_on_wake: str = "Hello, dear. I'm here."

    # Extended fields used by the system prompt
    hometown: str = ""
    career: str = ""
    favourite_foods: list[str] = field(default_factory=list)
    favourite_music: list[str] = field(default_factory=list)
    comfort_items: list[str] = field(default_factory=list)
    sensitivities: list[str] = field(default_factory=list)
    avoid_topics: list[str] = field(default_factory=list)
    caregiver_notes: str = ""


def load_profile(path: Path) -> PersonProfile:
    data = json.loads(path.read_text())
    return PersonProfile(**data)


# ── Default profile (Sam) ─────────────────────────────────────────────────────
DEFAULT_PROFILE = PersonProfile(
    name="Sam",
    age=70,
    condition="Alzheimer's disease (early-to-mid stage)",
    key_people=[
        "Margaret (wife, married 42 years — Sam lights up when she's mentioned)",
        "David (son, visits weekends)",
        "Claire (daughter, calls every Sunday, lives in Portland)",
        "Lily (granddaughter, age 8, Sam adores her)",
    ],
    favourite_topics=[
        "San Francisco Giants baseball",
        "World War II history",
        "his garden",
        "stories about his teaching days",
        "road trips up the California coast",
    ],
    photos={
        "margaret.bmp": "Margaret, their wedding day 1982",
        "garden.bmp":   "Sam's garden in full bloom",
        "lily.bmp":     "Lily at the park, last summer",
        "giants.bmp":   "AT&T Park, game day",
    },
    default_face="calm",
    default_led="warm",
    greeting_on_wake="Hello, Sam. It's so good to see you.",
    hometown="San Francisco, California",
    career="High school history teacher for 30 years",
    favourite_foods=["clam chowder", "sourdough bread", "apple pie", "morning coffee"],
    favourite_music=["Frank Sinatra", "big band jazz", "The Beatles", "classic country"],
    comfort_items=["warm coffee", "the smell of fresh bread", "baseball on the radio"],
    sensitivities=["his brother Frank, who passed away in 2019 — handle gently if mentioned"],
    avoid_topics=[
        "his diagnosis or memory loss directly",
        "anything that feels like a memory test",
        "news or politics",
    ],
    caregiver_notes=(
        "Sam responds very well to baseball and teaching stories. "
        "He sometimes believes it's the 1980s — go along gently, never correct. "
        "Morning sessions go better than evenings. He likes a slow, unhurried pace."
    ),
)
