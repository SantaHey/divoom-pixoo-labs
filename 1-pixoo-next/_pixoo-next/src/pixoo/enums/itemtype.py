from enum import IntEnum


class ItemType(IntEnum):
    SECONDS = 1
    MINUTES = 2
    HOURS = 3
    AMPM = 4
    TIME = 5
    TIME_WITH_SECONDS = 6
    YEAR = 7
    DAY = 8
    MONTH = 9
    MONTH_YEAR = 10
    MONTH_DAY = 11
    DATE = 12
    WEEKDAY = 15
    WEEKDAY_TWO = 13
    WEEKDAY_THREE = 14
    MONTH_NAME = 16
    TEMP = 17
    HIGH_TEMP = 18
    LOW_TEMP = 19
    FORECAST = 20
    NOISE_VALUE = 21
    TEXT = 22
    URL_REQUEST = 23


'''
DISPLAY TYPES

1 - Seconds (SS)
2 - Minutes (MM)
3 - Hour (HH)
4 - AM/PM
5 - HH:MM (12-hr)
6 - HH:MM:SS (12-hr)

7 - Year (YYYY)
8 - Day (DD)
9 - Month (MM)
10 - MM-YYYY
11 - MMM-DD
12 - DD-MMM-YYYY
13 - Weekday (Two letters; e.g. Su/Mo/Tu/We/Th/Fr/Sa)
14 - Weekday (Three letters; eg. Sun/Mon/Tue/Wed/Thu/Fri/Sat)
15 - Weekday (Full letters)
16 - Month (MMM)
17 - Temperature
18 - High Temperature
19 - Low Temperature
20 - Weather forecast
21 - Noise value
22 - Text string
23 - URL request string. The HTTP reponse must be a JSON encode with a "DispData" string.
'''