# Skill: Date Normalization

## Purpose

Understand natural language dates in French and English and convert them to YYYY-MM-DD before calling any tool that requires a date.

## Core rules

* Always convert natural language dates to YYYY-MM-DD before any tool call.
* Current year is 2026 when a year is not specified.

## CRITICAL: Getting the actual current date

You do NOT know the real current date. Your training date is not reliable.
Whenever you need today's or yesterday's date, you MUST call the date endpoint FIRST:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3001/tools/get_current_date"
```

This returns: `{ today: "YYYY-MM-DD", yesterday: "YYYY-MM-DD", utcNow: "..." }`

Use the `today` field for today. Use the `yesterday` field for yesterday.
NEVER guess or invent the date. Always call the endpoint first.

## Single-date conversions

Convert these phrases (after calling get_current_date):

* aujourd'hui, today, ce jour -> use `today` from get_current_date response
* hier, yesterday -> use `yesterday` from get_current_date response
* avant-hier -> use `today` minus 2 days

Examples:

* "le 5 mars" -> 2026-03-05
* "March 5" -> 2026-03-05
* "5 March 2025" -> 2025-03-05

## Range conversions

Convert these phrases into date ranges:

* cette semaine, this week -> Monday of current week to today
* la semaine derniere, last week -> Monday to Sunday of previous week
* ce mois, this month -> first day of current month to today
* le mois dernier, last month -> first day to last day of previous month

## Range execution rules

* If a user gives a date range, call the tool once per day in the range, then sum results.
* Maximum range is 7 days. If the range is longer, ask the user to narrow it.
* If a tool expects only one date, aggregate results and report a single total.
