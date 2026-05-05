# GeneralRules

**General rules go here**

The general purpose of these rules is to convert dates into the EnrichedDate type. See the structure below:

export type EnrichedDate \= {  
    date: Date;  
    paschaOffset: number;  
    newDate: number;  
    oldDate: number;  
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';  
    moon: 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST';  
    notes: string\[\];        // \[english, greek\]  
    mainText: {  
        feast?: string\[\];   // \[english, greek\]  
        saint?: string\[\];   // \[english, greek\]  
        note?: string\[\];    // \[english, greek\]  
    };  
    lowerText: {  
        tone?: string;  
        readings: string\[\];  
    };  
};

The date for Pascha is found in the *data/PaschaDates.csv* table  
The current year and previous year’s Pascha should be calculated

Using these Pascha dates, calculate PaschaOffset for each date:

* Pascha itself is 0  
* The day after is 1  
* The day before is \-1  
* 10 days after is 10  
* etc

Dates early in the year have a positive PaschaOffset calculated from the previous Pascha

Dates begin to calculate PaschaOffset off the current year's Pascha with \-84

After \-84, PaschaOffset numbers only go up until the end of the year

# MainTextRules

**Rules for main text area, including feast, saint, and note**

***Optional: EnrichedDate.mainText.feast (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***  
***Optional: EnrichedDate.mainText.saint (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***  
***Optional: EnrichedDate.mainText.note (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***

The following rules will surface feasts, saints, and notes. The final value that goes into any of these fields is as follows:

* If the date is missing a feast, saint, or note, then the subsequent optional key is missing entirely. It will never be present as an empty array, or an array of size 2 with two empty strings. In the rare occurrence that an English string is available without a Greek one, or vice-versa, then the field should be there and the missing language will be an empty string.  
* Rules below may trigger/add multiple of the same date, field, and language. For every date-field-language combo, these can be brought into a list, and then concatenated with a newline separator. The result should be a single string for each date-field-language, which are then brought into the array of size 2 for each date-field.

Entries in *data/text/Immovables.csv* are added based on dates, termed “immovables”. These should be added to every date.

Entries in *data/text/Movables.csv* are added based on PaschaOffset value, termed “movables”.

From the *data/text/Specials.csv*:

* Some Sundays are tied to the dates around which they fall. This category is termed “DRS” (date-related Sundays). The rules for DRS are:  
  * The “Sunday before the Elevation” is the Sunday between 9/7 \- 9/13  
  * The “Sunday after the Elevation” is the Sunday that falls between 9/15 \- 9/21  
  * The “First Sunday of Luke” is the Sunday between 9/22 \- 9/28  
  * The “2nd Sunday of Luke” is the Sunday between 9/29 \- 10/5.  
  * The “3rd Sunday of Luke” is the Sunday between 10/6 \- 10/10 or 10/18-10/19  
  * The “Holy Fathers of the 7th Ecumenical Council” is the Sunday between 10/11-10/17  
  * The “6th Sunday of Luke” is the Sunday between 10/20-10/26  
  * The “7th Sunday of Luke” is the Sunday between 10/27-10/29 or 11/6-11/9  
  * The “5th Sunday of Luke” is the Sunday between 10/30-11/5  
  * The “8th Sunday of Luke” is the Sunday between 11/10-11/16  
  * The “9th Sunday of Luke” is the Sunday between 11/17-11/23  
  * The “13th Sunday of Luke” is the Sunday between 11/24-11/30  
  * The “10th Sunday of Luke” is the Sunday between 12/4-12/10  
  * The “Sunday of the Holy Ancestors of Christ” is the Sunday between 12/11-12/17  
  * The “Sunday before Nativity” is the Sunday between 12/18-12/24.  
  * The “Sunday after Nativity” is the Sunday between 12/26-12/29, if it exists.  
  * The “Sunday before Theophany” is the Sunday between 12/30-01/05.  
  * The “Sunday after  Theophany” is the Sunday that falls between 01/07 and 01/13  
  * The “Holy Fathers of 4th Ecumenical Council” is the Sunday that falls between 07/13 and 07/19. It overrides the other movable feast data for that Sunday without affecting the ordering of the Sundays before or after it.  
* Other days have unique rules which apply to them. This category is termed “Special”. The rules for Special are:  
  * If 01/05 falls on a Monday through Friday, it will receive “Royal Hours” and “Liturgy of St. Basil”  
  * If 01/05 falls on a Saturday, 01/04 will receive “Royal Hours” and “No Liturgy”  
  * If 01/05 falls on a Sunday, 01/03 will receive “Royal Hours” and “No Liturgy”  
  * If 12/24 falls on a Monday through Friday, it will receive “Royal Hours” and “Liturgy of St. Basil”  
  * If 12/24 falls on a Saturday, 12/23 will receive “Royal Hours” and “No Liturgy”  
  * If 12/24 falls on a Sunday, 12/22 will receive “Royal Hours” and “No Liturgy”  
  * The “Daylight Savings Time ends. Turn clocks back 1 hour” mainText.note is on the first Sunday in November  
  * The “Daylight Savings Time begins. Turn clocks forward 1 hour” mainText.note is on the second Sunday in March

When immovables coincide with movables, DRS or Special, both are celebrated together, with limited exceptions. The immovables on 01/06, 08/06, 09/14 and 12/25 eliminate all other movables, DRS or Special events which may coincide with them.

# LowerTextRules

**Rules for readings and tone (within lowerText) go here**

***Optional: EnrichedDate.lowerText.tone (see 8 possible values below)***

There are 8 tones that go in order:

1. 1st Tone  
2. 2nd Tone  
3. 3rd Tone  
4. 4th Tone  
5. Plagal 1st Tone  
6. Plagal 2nd Tone  
7. Grave Tone  
8. Plagal 4th Tone

Tones only show on Sundays, and are missing otherwise. Some Sundays are missing tones. They begin at PaschaOffset 14 with “2nd Tone” and continue incrementing every Sunday. PaschaOffset 21 has “3rd Tone” etc. After the final “Plagal 4th Tone”, the tones wrap around, and the following Sunday goes back to “1st Tone” PaschaOffset 49 does not have its tone listed, although it does not affect the ordering (the week before is “Plagal 2nd Tone” and the week after is “Plagal 4th Tone”. Tones at the beginning of the year continue based on the previous year’s tones and end on PaschaOffset \-14 as the last Sunday with a tone listed. Tones then “reset” to “2nd Tone” at PaschaOffset 14\. Sundays will not have their tones listed if they fall on 1/6,  8/6, 9/14 and 12/25, but that will not affect the ordering. 

***Required: EnrichedDate.lowerText.readings (array/list of free-form text strings)***

Write rules for readings here

For now, these rules are empty. Generate data with empty arrays..

# FastingRules

**Rules for background and fasting fields**

***Required: EnrichedDate.background (STANDARD/FASTING)***

“background” field is based off of the “fasting” field.  
Dates with fasting value NONE receive background STANDARD  
Dates with any fasting value besides NONE receive background FASTING

***Required: EnrichedDate.fasting (NONE/DAIRY/FISH/OIL/STRICT)***

First create a fasting basemap for the entire year. This will consist of NONE fasting for Mondays, Tuesdays, Thursdays, Saturdays and Sundays. Wednesdays and Fridays are STRICT.

Then apply the fasting rules for Movables. These rules override anything on the basemap.

Movables:

* Cheese Fare: PaschaOffset \-55 through \-49  
  * DAIRY on every day except Wednesday and Friday  
  * OIL on Wednesday and Friday  
* Great Lent: PaschaOffset \-48 through \-1  
  * OIL on Saturday and Sunday  
  * STRICT fasting every other day  
* Bright Week: PaschaOffset 0 through 6  
  * NONE fasting  
* Pentecostarion outside bright week: PaschaOffset 7 through 49  
  * OIL on midpentecost PaschaOffset 24  
  * NONE on apodosis of pascha PaschaOffset 38  
* Week after Pentecost: PaschaOffset 50 through 55  
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

* 11/15 through 11/20  
* 12/18 through 12/23

The following dates are always FISH:

* 03/25  
* 08/06  
* 11/21

The following dates are STRICT fasting if they fall on Monday, Wednesday or Friday, OIL if they fall on Tuesday or Thursday, and FISH if they fall on Saturday or Sunday:

* 11/22 through 11/29  
* 12/1 through 12/5  
* 12/7 through 12/11  
* 12/13 through 12/17

The following dates are always NONE fasting

* 01/01  
* 01/06  
* 12/25

The following dates are NONE fasting if they fall on a Monday, Tuesday, Thursday, Saturday or Sunday, and they are OIL if they fall on Wednesday or Friday:

* 01/02  
* 01/03  
* 01/04  
* 01/07  
* 01/17  
* 01/20  
* 01/28  
* 01/30  
* 02/10  
* 05/08  
* 05/21  
* 06/30  
* 07/20  
* 07/27  
* 08/16  
* 08/24  
* 09/26  
* 10/20  
* 10/26  
* 11/08  
* 11/09

The following dates are NONE fasting if they fall on Monday, Tuesday, Thursday, Saturday or Sunday, and they are FISH if they fall on Wednesday or Friday:

* 02/02?  
* 06/29  
* 08/15  
* 09/08

The following dates are OIL if they fall on Monday, Tuesday, Wednesday, Thursday or Friday, and they are FISH if they fall on Saturday or Sunday:

* 11/25  
* 11/30  
* 12/06  
* 12/12

03/09 is:

* NONE fasting if PaschaOffset\<-48 /\*before clean Monday\*/ and also on a Monday, Tuesday, Thursday, Saturday or Sunday  
* OIL if PaschaOffset\<-48 /\*before clean Monday\*/ and also on a Wednesday or Friday  
* STRICT fast if \-48\<=PaschaOffset\<=-44 /\*Mon-Fri first week of Great Lent\*/  
* OIL if PaschaOffset\>-44 /\*after the first Friday of great lent\*/, regardless of the day of the week.

04/23 is:

* STRICT fasting if PaschaOffset\<0 and on a Monday, Tuesday, Wednesday, Thursday, Friday or PaschaOffset=-1 /\*on holy Saturday\*/  
* OIL if PaschaOffset\>0 and on a Saturday or Sunday that is PaschaOffset\<\>-1 /\*not holy Saturday\*/  
* OIL if PaschaOffset\>7 /\*after Thomas Sunday\*/ and on Wednesday or Friday  
* NONE fasting if it is PaschaOffset\>0 and on a Monday, Tuesday, Thursday, Saturday or Sunday, or if it is PaschaOffset=3 OR PaschaOffset=5

06/24 is:

* NONE fasting if it falls before the Monday after all saints (PaschaOffset 57\) and it is on a Monday, Tuesday, Thursday, Saturday or Sunday  
* OIL if it falls before the Monday after all saints (PaschaOffset 57\) and is on a Wednesday or Friday, or if it falls on or after the Monday after all saints (PaschaOffset).

The dates where PaschaOffset\>56 /\*after the Sunday of all saints\*/ and before 6/29 (if any) receive special rules:

* Mondays, Wednesdays, and Fridays are STRICT days  
* Tuesdays and Thursdays are OIL  
* Saturdays and Sundays are FISH  
* EXCEPTION: 06/24 (if it falls during this period), see rule above

# NoteRules

**Rules for lengthy notes, eg “Some traditions allow for no fasting on this day”**

***Optional: EnrichedDate.notes (array/list of length 2, required: 1st entry english, required: 2nd entry greek)***

Lengthy notes in English and Greek can be determined as follows

PaschaOffset=-53 and PaschaOffset=-51 receive the following lengthy note:

* Lengthy note text: “Some traditions allow for no fasting on this day.” / “Κατ’ ἄλλη ἐκδοχὴ δὲν ἔχει νηστεία αὐτὴ τὴν ἡμέρα.”

Wednesdays and Fridays when 7\<PaschaOffset\<49 /\*between Thomas Sunday and Pentecost\*/ receive the following lengthy note.

* Exception: This note is removed if it coincides with the following dates: 04/23, 05/08, 05/21 or 06/24  
* Exception: The note is removed on PaschaOffset=24 /\*Mid-Pentecost\*/ and PaschaOffset=38 /\*Apodosis of Pascha\*/  
* Lengthy note text: “Some monasteries, including St. Anthony’s, follow fasting rules that do not permit wine and oil on Wednesdays and Fridays between Bright Week and Pentecost.” / “Ἡ Ἱ.Μ. Ἁγ. Ἀντωνίου καὶ ἄλλα μοναστήρια ἀκολουθοῦν κανόνες, ποὺ δὲν ἐπιτρέπουν κατάλυση οἴνου καὶ ἐλαίου τὴν Τετάρτη καὶ Παρασκευὴ μετὰ τὴν διακαινήσιμο ἑβδομάδα ἕως καὶ τὴν Πεντηκοστή.”

PaschaOffset=-7 /\*Palm Sunday\*/ receive the following lengthy note:

* Lengthy note text: “Some traditions allow for fish on Palm Sunday.” / “Κατ’ ἄλλη ἐκδοχὴ ἐπιτρέπεται κατάλυσις ἰχθύος τὴν Κυριακὴ τῶν Βαΐων.”

Wednesdays and Fridays between 01/02 through 01/04 and between 12/26 through 12/31 receive the following lengthy note:

* Lengthy note text: “Some traditions allow for no fasting on this day.” / “Κατ’ ἄλλη ἐκδοχὴ δὲν ἔχει νηστεία αὐτὴ τὴν ἡμέρα.”

