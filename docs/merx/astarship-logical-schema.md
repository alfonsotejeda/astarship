## 1. Entidades

| Entidad      | Atributos                                                               |
| ------------ | ----------------------------------------------------------------------- |
| User         | <u>ID</u>, Name                                                         |
| TravelGroup  | <u>ID</u>, Name                                                         |
| Package      | <u>ID</u>, Name, Destination, Validated, CreationDate, ItineraryCount   |
| Itinerary    | <u>ID</u>, CreationDate, Validated, ActivityCount                       |
| ActivityType | <u>Code</u>, Name                                                       |
| Category     | <u>ID</u>, Name                                                         |
| Activity     | <u>ID</u>, Name, EffortLevel, Validated, CreationDate                   |
| Attraction   | <u>ID</u>, Name, Address, Latitude, Longitude                           |

| Especialización | Supertipo | Subtipos                                   |
| --------------- | --------- | ------------------------------------------ |
| Role            | User      | Admin, Guide, OperationsManager, Tourist   |

## 2. Interrelaciones

| Interrelación     | Participantes           | Cardinalidad | (min,max)                            |
| ----------------- | ----------------------- | ------------ | ------------------------------------ |
| Belongs           | Tourist — TravelGroup   | N:1          | Tourist (1,1) — TravelGroup (1,\*)   |
| Classifies        | Activity — Category     | N:1          | Activity (1,1) — Category (0,\*)     |
| Is of Type        | Activity — ActivityType | N:1          | Activity (1,1) — ActivityType (0,\*) |
| Coverage          | Category — Package      | N:M          | Category (0,\*) — Package (1,\*)     |
| Generates         | Activity — Guide        | N:1          | Activity (1,1) — Guide (0,\*)        |
| At                | Activity — Attraction   | N:1          | Activity (1,1) — Attraction (0,\*)   |
| Booking           | Tourist — Package       | N:M          | Tourist (0,\*) — Package (0,\*)      |
| Belongs           | Itinerary — Package     | N:1          | Itinerary (1,1) — Package (0,\*)     |
| Generates         | Package — Guide         | N:1          | Package (1,1) — Guide (0,\*)         |
| Generates         | Itinerary — Guide       | N:1          | Itinerary (1,1) — Guide (0,\*)       |
| Assigns           | Admin — Assignment      | 1:N          | Admin (0,\*) — Assignment (1,1)      |

## 3. Agregaciones

| Agregación            | Participantes                 | Interrelación | Cardinalidad | (min,max)                                   | Atributos                               | Usada por                     |
| --------------------- | ----------------------------- | ------------- | ------------ | ------------------------------------------- | --------------------------------------- | ----------------------------- |
| Proportion Type       | Itinerary — ActivityType      | Proportion    | N:M          | Itinerary (1,\*) — ActivityType (0,\*)      | Value                                   | —                             |
| Proportion Category   | Itinerary — Category          | Proportion    | N:M          | Itinerary (1,\*) — Category (0,\*)          | Value                                   | —                             |
| Itinerary Validation  | Itinerary — OperationsManager | Validates     | N:M          | Itinerary (0,\*) — OperationsManager (0,\*) | ValidationDate, Result, Observations    | —                             |
| Package Validation    | Package — OperationsManager   | Validates     | N:M          | Package (0,\*) — OperationsManager (0,\*)   | ValidationDate, Result, Observations    | —                             |
| Activity Validation   | Activity — OperationsManager  | Validates     | N:M          | Activity (0,\*) — OperationsManager (0,\*)  | ValidationDate, Result, Observations    | —                             |
| Assignment            | Itinerary — Tourist           | Assigned      | N:M          | Itinerary (0,\*) — Tourist (0,\*)           | AssignmentDate, Status, Rating, Comment | Assigns, Modification Request |
| Modification Request  | Tourist — Assignment          | Requests      | N:M          | Tourist (0,\*) — Assignment (0,\*)          | RequestDate, Description, Result        | —                             |
| Itinerary Composition | Itinerary — Activity          | Composes      | N:M          | Itinerary (1,\*) — Activity (0,\*)          | Order, Day, StartTime                   | —                             |

## 4. Esquema Lógico Relacional

### Entidades:

**User**(<u>ID</u>, Name, Role, ID_TravelGroup)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_TravelGroup REFERENCES TravelGroup(ID)*

**TravelGroup**(<u>ID</u>, Name)

**Package**(<u>ID</u>, Name, Destination, Validated, CreationDate, ItineraryCount, ID_Guide)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*

**Itinerary**(<u>ID</u>, CreationDate, Validated, ActivityCount, ID_Package, ID_Guide)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*

**ActivityType**(<u>Code</u>, Name)

**Category**(<u>ID</u>, Name)

**Attraction**(<u>ID</u>, Name, Address, Latitude, Longitude)

**Activity**(<u>ID</u>, Name, EffortLevel, Validated, CreationDate, Code_Type, ID_Category, ID_Guide, ID_Attraction)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: Code_Type REFERENCES ActivityType(Code)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Category REFERENCES Category(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Attraction REFERENCES Attraction(ID)*

### Interrelaciones:

**Booking**(<u>ID_Tourist</u>, <u>ID_Package</u>)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Tourist REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*

**Coverage**(<u>ID_Package</u>, <u>ID_Category</u>)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Category REFERENCES Category(ID)*

### Agregaciones:

**ProportionType**(<u>ID_Itinerary</u>, <u>Code_Type</u>, Value)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: Code_Type REFERENCES ActivityType(Code)*

**ProportionCategory**(<u>ID_Itinerary</u>, <u>ID_Category</u>, Value)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Category REFERENCES Category(ID)*

**ItineraryValidation**(<u>ID_Itinerary</u>, <u>ID_Manager</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Manager REFERENCES User(ID)*

**PackageValidation**(<u>ID_Package</u>, <u>ID_Manager</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Manager REFERENCES User(ID)*

**ActivityValidation**(<u>ID_Activity</u>, <u>ID_Manager</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Activity REFERENCES Activity(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Manager REFERENCES User(ID)*

**Assignment**(<u>ID_Itinerary</u>, <u>ID_Tourist</u>, AssignmentDate, Status, Rating, Comment, ID_Admin)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Tourist REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Admin REFERENCES User(ID)*

**ModificationRequest**(<u>ID_Itinerary</u>, <u>ID_Tourist</u>, <u>ID_Requester</u>, <u>RequestDate</u>, Description, Result)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: (ID_Itinerary, ID_Tourist) REFERENCES Assignment(ID_Itinerary, ID_Tourist)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Requester REFERENCES User(ID)*

**ItineraryComposition**(<u>ID_Itinerary</u>, <u>ID_Activity</u>, Order, Day, StartTime)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Activity REFERENCES Activity(ID)*
