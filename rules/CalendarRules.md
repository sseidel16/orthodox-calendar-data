# GeneralRules

**General rules**

These rules describe how to produce enriched calendar data for a given date range. The rules apply identically to both the Gregorian (new) and Julian (old) calendars — the only difference is that the Julian calendar is 13 days behind the Gregorian calendar. When a rule references a specific date like 01/05 or 12/24, that date means the same thing in whichever calendar is being computed. The entire process is run once per calendar.

The output for each date is:

export type EnrichedDateData \= {  
    date: number;  
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';  
    lengthyNotes: string\[\]; // \[english, greek\]  
    feast?: string\[\];       // \[english, greek\]  
    saint?: string\[\];       // \[english, greek\]  
    note?: string\[\];        // \[english, greek\]  
    tone?: string;  
    readings: string\[\];  
}

Movable references are days in the year that are not on the same date (they move) every year. Movable references must be calculated first for a particular year. Each movable reference has a separate method to calculate. Each calendar uses its own Pascha date from *data/PaschaDates.csv*.

All movable references are found in *data/MovableReferences.csv*. The instructions to calculate each are listed below:

* PASCHA \- The date for Pascha is found in the *data/PaschaDates.csv* table (one column per calendar). The current year and previous year’s Pascha should be calculated.  
* ECUM4 \- the Sunday between 07/13 and 07/19  
* SATbT \- the Saturday between 12/30-01/05  
* SUNbT \- the Sunday between 12/30-01/05  
* SATaT \- the Saturday between 01/07 and 01/13  
* SUNaT \- the Sunday between 01/07 and 01/13  
* SATbE \- the Saturday between 9/7 \- 9/13  
* SUNbE \- the Sunday between 9/7 \- 9/13  
* SATaE \- the Saturday between 9/15 \- 9/21  
* SUNaE \- the Sunday between 9/15 \- 9/21  
* L1 \- the Sunday between 9/22 \- 9/28  
* L2 \- the Sunday between 9/29 \- 10/5  
* L3 \- is the Sunday between 10/6 \- 10/10 or 10/18-10/19  
* L4 \- the Sunday between 10/11-10/17  
* L5 \- the Sunday between 10/30-11/5  
* L6 \- the Sunday between 10/20-10/26  
* L7 \- the Sunday between 10/27-10/29 or 11/6-11/9  
* L8 \- the Sunday between 11/10-11/16  
* L9 \- the Sunday between 11/17-11/23  
* L10 \- the Sunday between 12/4-12/10  
* L11 \- the Sunday between 12/11-12/17  
* L13 \- the Sunday between 11/24-11/30  
* SATbN \- the Saturday between 12/18-12/24  
* SUNbN \- the Sunday between 12/18-12/24  
* SATaN \- the Saturday between 12/26-12/29, if it exists  
* SUNaN \- the Sunday between 12/26-12/29, if it exists

Between SUNaT and PASCHA-70 (non-inclusive), there may be up to 6 Sundays, termed “*gap Sundays*”. The gap Sundays should be assigned the following movable references depending on how many Sundays are available:

* 1: L15  
* 2: L12, L15  
* 3: L12, L15, M17  
* 4: L12, L14, L15, M17  
* 5: L12, L14, M16, L15, M17  
* 6: L12, L14, M15, M16, L15, M17

Once all movable references have been determined (as well as the previous year’s PASCHA, see below), any movable reference symbol combined with an offset can be converted to 0, 1, or 2 specific dates in the year. Some movable references may not exist every year (e.g., SUNaN). A symbol+offset combination may resolve to two dates when both the previous and current year’s cycles overlap within the calendar year.

For example, the symbol for Pascha is “PASCHA”

* The date of PASCHA itself is  “PASCHA+0” or simply “PASCHA”  
* The day after is PASCHA+1  
* The day before is PASCHA-1  
* 10 days before is PASCHA-10

PASCHA offsets from the previous year (positive offsets) are valid from 01/01 through PASCHA-70 (non-inclusive) of the current year. PASCHA offsets from the current year (negative offsets going forward) are valid from SUNaT (non-inclusive) onward. There is an overlap between SUNaT (non-inclusive) and PASCHA-70 (non-inclusive) where both cycles produce valid dates — a single symbol+offset can resolve to two different dates in the same year, one from each cycle. This is expected and both placements are correct.

# FastingRules

**Rules for fasting field**

***Required: EnrichedDateData.fasting (NONE/DAIRY/FISH/OIL/STRICT)***

First create a fasting basemap for the entire year. This will consist of NONE fasting for Mondays, Tuesdays, Thursdays, Saturdays and Sundays. Wednesdays and Fridays are STRICT.

Then apply the fasting rules for Movables. These rules override anything on the basemap.

Movables:

* Cheese Fare: PASCHA-55 through PASCHA-49  
  * DAIRY on every day except Wednesday and Friday  
  * OIL on Wednesday and Friday  
* Great Lent: PASCHA-48 through PASCHA-1  
  * OIL on Saturday and Sunday  
  * STRICT fasting every other day  
* Bright Week: PASCHA+0 through PASCHA+6  
  * NONE fasting  
* Pentecostarion outside bright week: PASCHA+7 through PASCHA+49  
  * OIL on every Wednesday and Friday except PASCHA+38  
  * NONE on apodosis of pascha PASCHA+38  
* Week after Pentecost: PASCHA+50 through PASCHA+55  
  * NONE

Then apply the rules below, which override anything up until this point.

Other Fasting Rules:

The following dates are STRICT fasting if they fall on Monday through Friday, and they are OIL if they fall on Saturday or Sunday.

* 01/05  
* 08/01 through 08/05 and 08/07 through 08/14  
* 08/29  
* 09/14  
* 12/24

The following dates are STRICT fasting if they fall on Monday, Wednesday or Friday, and they are OIL if they fall on Tuesday, Thursday, Saturday or Sunday:

* 11/15 through 11/20 inclusive  
* 12/18 through 12/23 inclusive

The following dates are always FISH:

* 03/25  
* 08/06  
* 11/21

The following dates are STRICT fasting if they fall on Monday, Wednesday or Friday, OIL if they fall on Tuesday or Thursday, and FISH if they fall on Saturday or Sunday:

* 11/22 through 11/29 inclusive  
* 12/1 through 12/5 inclusive  
* 12/7 through 12/11 inclusive  
* 12/13 through 12/17 inclusive

The following dates are always NONE fasting

* 01/01, 01/06, 12/25

The following dates are NONE fasting if they fall on a Monday, Tuesday, Thursday, Saturday or Sunday, and they are OIL if they fall on Wednesday or Friday:

* 01/02, 01/03, 01/04, 01/07, 01/17, 01/20, 01/28, 01/30, 02/10, 05/08, 05/21, 06/30, 07/20, 07/27, 08/16, 08/24, 09/26, 10/20, 10/26, 11/08, 11/09, 11/13

The following dates are NONE fasting if they fall on Monday, Tuesday, Thursday, Saturday or Sunday, and they are FISH if they fall on Wednesday or Friday:

* 02/02, 06/29, 08/15, 09/08

The following dates are OIL if they fall on Monday, Tuesday, Wednesday, Thursday or Friday, and they are FISH if they fall on Saturday or Sunday:

* 11/25, 11/30, 12/06, 12/12

03/09 is:

* NONE fasting if before PASCHA-48 /\*clean Monday\*/ and also on a Monday, Tuesday, Thursday, Saturday or Sunday  
* OIL if before PASCHA-48 /\*clean Monday\*/ and also on a Wednesday or Friday  
* STRICT fast if from PASCHA-48 through PASCHA-44 inclusive /\*Mon-Fri first week of Great Lent\*/  
* OIL if after PASCHA-44 /\*the first Friday of great lent\*/, regardless of the day of the week.

04/23 is:

* STRICT fasting if before PASCHA+0 and on a Monday, Tuesday, Wednesday, Thursday, Friday or PASCHA-1 /\*Holy Saturday\*/  
* OIL if before PASCHA+0 and on a Saturday or Sunday that is not PASCHA-1 /\*Holy Saturday\*/  
* OIL if after PASCHA+7 /\*Thomas Sunday\*/ and on Wednesday or Friday  
* NONE fasting if it is after PASCHA+0 and on a Monday, Tuesday, Thursday, Saturday or Sunday, or if it is on PASCHA+3 OR PASCHA+5

06/24 is:

* NONE fasting if it falls before the Monday after PASCHA+56 /\*All Saints\*/ and it is on a Monday, Tuesday, Thursday, Saturday or Sunday  
* OIL if it falls before PASCHA+56 /\*All Saints\*/ and is on a Wednesday or Friday, or if it falls after PASCHA+56 /\*All Saints\*/.

The dates after PASCHA+56 /\*All Saints\*/ and before 6/29 (if any) receive special rules:

* Mondays, Wednesdays, and Fridays are STRICT days  
* Tuesdays and Thursdays are OIL  
* Saturdays and Sundays are FISH  
* EXCEPTION: 06/24 (if it falls during this period), see rule above

# LengthyNotesRules

**Rules for lengthy notes, eg “Some traditions allow for no fasting on this day”**

***Optional: EnrichedDateData.lengthyNotes (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***

Lengthy notes in English and Greek can be determined as follows

PASCHA-67, PASCHA-65, PASCHA-53, PASCHA-51 receive the following lengthy note:

* Lengthy note text: “Some traditions allow for no fasting on this day.” / “Κατ’ ἄλλη ἐκδοχὴ δὲν ἔχει νηστεία αὐτὴ τὴν ἡμέρα.”

Wednesdays and Fridays from PASCHA+7 to PASCHA+49 non-inclusive /\*between Thomas Sunday and Pentecost\*/ receive the following lengthy note.

* Exception: This note is removed if it coincides with the following dates: 04/23, 05/08, 05/21 or 06/24  
* Exception: The note is removed on PASCHA+24 /\*Mid-Pentecost\*/ and PASCHA+38 /\*Apodosis of Pascha\*/  
* Lengthy note text: “Some monasteries, including St. Anthony’s, follow fasting rules that do not permit wine and oil on Wednesdays and Fridays between Bright Week and Pentecost.” / “Ἡ Ἱ.Μ. Ἁγ. Ἀντωνίου καὶ ἄλλα μοναστήρια ἀκολουθοῦν κανόνες, ποὺ δὲν ἐπιτρέπουν κατάλυση οἴνου καὶ ἐλαίου τὴν Τετάρτη καὶ Παρασκευὴ μετὰ τὴν διακαινήσιμο ἑβδομάδα ἕως καὶ τὴν Πεντηκοστή.”

PASCHA-7 /\*Palm Sunday\*/ receive the following lengthy note:

* Lengthy note text: “Some traditions allow for fish on Palm Sunday.” / “Κατ’ ἄλλη ἐκδοχὴ ἐπιτρέπεται κατάλυσις ἰχθύος τὴν Κυριακὴ τῶν Βαΐων.”

Wednesdays and Fridays between 01/02 through 01/04 and between 12/26 through 12/31 receive the following lengthy note:

* Lengthy note text: “Some traditions allow for no fasting on this day.” / “Κατ’ ἄλλη ἐκδοχὴ δὲν ἔχει νηστεία αὐτὴ τὴν ἡμέρα.”

# FeastSaintNoteRules

**Rules for main text area, including feast, saint, and note**

***Optional: EnrichedDateData.feast (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***  
***Optional: EnrichedDateData.saint (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***  
***Optional: EnrichedDateData.note (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***

The following rules will surface feasts, saints, and notes. The final value that goes into any of these fields is as follows:

* If the date is missing a feast, saint, or note, then the subsequent optional key is missing entirely. It will never be present as an empty array, or an array of size 2 with two empty strings. In the rare occurrence that an English string is available without a Greek one, or vice-versa, then the field should be there and the missing language will be an empty string.  
* Rules below may trigger/add multiple of the same date, field, and language. For every date-field-language combo, these can be brought into a list, and then concatenated with a newline separator. The result should be a single string for each date-field-language, which are then brought into the array of size 2 for each date-field.

Entries in *data/TextMovable.csv*, termed “movables”, are added based on movable references, very often the PASCHA offset value. Exceptions:

* Text movables that are offset from PASCHA should only be added if they fall before SUNbE non-inclusive

Entries in *data/TextImmovable.csv* are added based on dates, termed “immovables”. These should be added to every date.

Entries in *data/TextSpecial.csv*, termed “specials”, are added based on unique rules. The rules for specials are:

* If 01/05 falls on a Monday through Friday, it will receive “Royal Hours” and “Liturgy of St. Basil”  
* If 01/05 falls on a Saturday, 01/04 will receive “Royal Hours” and “No Liturgy”  
* If 01/05 falls on a Sunday, 01/03 will receive “Royal Hours” and “No Liturgy”  
* If 12/24 falls on a Monday through Friday, it will receive “Royal Hours” and “Liturgy of St. Basil”  
* If 12/24 falls on a Saturday, 12/23 will receive “Royal Hours” and “No Liturgy”  
* If 12/24 falls on a Sunday, 12/22 will receive “Royal Hours” and “No Liturgy”  
* The “Daylight Savings Time ends. Turn clocks back 1 hour” mainText.note is on the first Sunday in November  
* The “Daylight Savings Time begins. Turn clocks forward 1 hour” mainText.note is on the second Sunday in March

If 4/23 falls before PASCHA+2 /\* Bright Tuesday \*/, the main text Type=Saint from 04/23 is shown again on PASCHA+2, at the beginning of, and in addition to, any main text saint data for that date.

When immovables coincide with movables or specials, both are celebrated together (combined), with limited exceptions. The immovables on 01/06, 08/06, 09/14 and 12/25 eliminate all other movables or specials that may coincide with them. Ordering within lists should be in the order they appear in the data sheet, with overall ordering of movables, immovables, specials.

Exception: feast text from ECUM4 overrides any other feast text that may be on that day

# ToneRules

**Rules for tone go here**

***Optional: EnrichedDateData.tone (see 8 possible values below)***

There are 8 tones that go in order:

1. 1st Tone  
2. 2nd Tone  
3. 3rd Tone  
4. 4th Tone  
5. Plagal 1st Tone  
6. Plagal 2nd Tone  
7. Grave Tone  
8. Plagal 4th Tone

Tones only show on Sundays, and are missing otherwise. Some Sundays are missing tones. They begin at PASCHA+14 with “2nd Tone” and continue incrementing every Sunday. PASCHA+21 has “3rd Tone” etc. After the final “Plagal 4th Tone”, the tones wrap around, and the following Sunday goes back to “1st Tone”. Tones at the beginning of the year continue based on the previous year’s tones and end on PASCHA-14 as the last Sunday with a tone. Tones then “reset” to “2nd Tone” at PASCHA+14. Sundays will not have their tones listed if they fall on 01/06, 08/06, 09/14, 12/25 or PASCHA+49, but that will not affect the ordering (ie. the tones will increment by 2 from the week before to the week after).

# ReadingsRules

**Rules for readings go here**

***Required: EnrichedDateData.readings (array/list of free-form text strings)***

First, apply the movable readings from *data/ReadingsMovable.csv* as follows:

* Readings that share the same symbol, offset, and type are adjacent rows in the table and bundled together  
* These bundles should be applied in the order that they appear in the data table.  
* If a bundle is being applied to a date that already contains a bundle of the same type, it will clear out and overwrite the existing bundle

Next, for *gap Sundays*, epistle bundles are taken from other days with specific PASCHA offsets. The offsets are determined depending on how many Sundays are available, and are listed below:

* 1: 273 (symbol PASCHA, offset 273, type EPISTLE)  
* 2: 252, 273  
* 3: 252, 273, 168  
* 4: 252, 266, 273, 168  
* 5: 252, 259, 266, 273, 168  
* 6: 245, 252, 259, 266, 273, 168

Next, apply immovable readings from *data/ReadingsImmovable.csv* in the following way:

* Lower level reading dates are immovable readings that replace the readings which are found on that day except: Sundays, all days between PASCHA+1 through PASCHA+6 inclusive /\*Bright Week\*/, PASCHA+24 /\*Mid-Pentecost\*/, and PASCHA+39 /\*Ascension\*/   
  * 01/05, 01/07, 01/08, 01/09, 01/10, 01/11, 01/12, 01/13, 09/10, 09/11, 09/12, 09/13, 12/24, unless it falls on a Saturday  
  * 01/17, 01/18, 01/20, 01/25, 01/28, 01/30, 02/10, 02/24, 03/09, 04/25, 05/08, 05/21, 05/25, 06/24, 06/29, 06/30, 07/05, 07/20, 07/25, 07/27, 08/01, 08/07, 08/24, 08/29, 08/31, 09/01, 09/23, 09/26, 10/01, 10/18, 10/20, 10/26, 11/08, 11/09, 11/13, 11/16, 11/25, 11/30, 12/05, 12/06, 12/09, 12/12, 12/17, 12/26, 12/27  
  * 04/23 unless it falls before PASCHA+2 /\*Bright Tuesday\*/  
* Higher level reading dates are immovable readings that replace the readings which are found on that day no matter what:  
  * 01/01, 01/06, 02/02, 03/25, 08/06, 08/15, 09/08, 09/14, 11/21, 12/25

Ordering within readings should be in the order they appear in the bundle from the data sheet, with overall ordering of OLD, EPISTLE, GOSPEL. 

Additional rules:

* If 01/06 is a Monday, eliminate the readings on 01/03 \- there will be no readings at all  
* If 01/06 is a Sunday, eliminate the readings on 01/04 \- there will be no readings at all  
* If 12/25 is a Monday, eliminate the readings on 12/22 \- there will be no readings at all  
* If 12/25 is a Sunday, eliminate the readings on 12/23 \- there will be no readings at all  
* On 03/25, eliminate any OLD readings on that date

