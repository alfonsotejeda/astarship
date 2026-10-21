## 1. Entidades

| Entidad      | Atributos                                                    |
| ------------ | ------------------------------------------------------------ |
| User         | <u>ID</u>, Name, Email                                       |
| TravelGroup  | <u>ID</u>, Name                                              |
| Package      | <u>ID</u>, Name, Destination, Status, CreationDate           |
| Itinerary    | <u>ID</u>, CreationDate, Status, ActivityCount               |
| ActivityType | <u>Code</u>, Name                                            |
| Category     | <u>ID</u>, Name                                              |
| Activity     | <u>ID</u>, Name, EffortLevel, Duration, Status, CreationDate |
| Attraction   | <u>ID</u>, Name, Address, Latitude, Longitude                |

| Especialización | Supertipo | Subtipo           | Atributos |
| --------------- | --------- | ----------------- | --------- |
| Role            | User      | Admin             | —         |
| Role            | User      | Guide             | Specialty |
| Role            | User      | OperationsManager | —         |
| Role            | User      | Tourist           | Age       |

## 2. Interrelaciones

| Interrelación | Participantes           | Cardinalidad | (min,max)                            |
| ------------- | ----------------------- | ------------ | ------------------------------------ |
| Belongs       | Tourist — TravelGroup   | N:1          | Tourist (1,1) — TravelGroup (1,\*)   |
| Classifies    | Activity — Category     | N:1          | Activity (1,1) — Category (0,\*)     |
| Is of Type    | Activity — ActivityType | N:1          | Activity (1,1) — ActivityType (0,\*) |
| Coverage      | Category — Package      | N:M          | Category (0,\*) — Package (1,\*)     |
| Generates     | Activity — Guide        | N:1          | Activity (1,1) — Guide (0,\*)        |
| At            | Activity — Attraction   | N:1          | Activity (1,1) — Attraction (0,\*)   |
| Attends       | Guide — TravelGroup     | 1:N          | Guide (0,\*) — TravelGroup (1,1)     |
| Belongs       | Itinerary — Package     | N:1          | Itinerary (1,1) — Package (0,\*)     |
| Generates     | Package — Admin         | N:1          | Package (1,1) — Admin (0,\*)         |
| Generates     | Itinerary — Guide       | N:1          | Itinerary (1,1) — Guide (0,\*)       |
| Assigns       | Admin — Assignment      | 1:N          | Admin (0,\*) — Assignment (1,1)      |

## 3. Agregaciones

| Agregación            | Participantes                      | Interrelación | Cardinalidad | (min,max)                                        | Atributos                                | Usada por                            |
| --------------------- | ---------------------------------- | ------------- | ------------ | ------------------------------------------------ | ---------------------------------------- | ------------------------------------ |
| Proportion Type       | Itinerary — ActivityType           | Proportion    | N:M          | Itinerary (1,\*) — ActivityType (0,\*)           | Value                                    | —                                    |
| Proportion Category   | Itinerary — Category               | Proportion    | N:M          | Itinerary (1,\*) — Category (0,\*)               | Value                                    | —                                    |
| Itinerary Validation  | Itinerary — Guide                  | Validates     | N:M          | Itinerary (0,\*) — Guide (0,\*)                  | ValidationDate, Result, Observations     | —                                    |
| Itinerary Approval    | Itinerary — OperationsManager      | Approves      | N:M          | Itinerary (0,\*) — OperationsManager (0,\*)      | ApprovalDate, Result, Observations       | —                                    |
| Package Validation    | Package — OperationsManager        | Validates     | N:M          | Package (0,\*) — OperationsManager (0,\*)        | ValidationDate, Result, Observations     | —                                    |
| Activity Validation   | Activity — Admin                   | Validates     | N:M          | Activity (0,\*) — Admin (0,\*)                   | ValidationDate, Result, Observations     | —                                    |
| Assignment            | Itinerary — Tourist                | Assigned      | N:M          | Itinerary (0,\*) — Tourist (0,\*)                | AssignmentDate, Status                   | Assigns, Modification Request, Visit |
| Modification Request  | Guide — Assignment                 | Handles       | N:M          | Guide (0,\*) — Assignment (0,\*)                 | RequestDate, Description, Status, Result | —                                    |
| Itinerary Composition | Itinerary — Activity               | Composes      | N:M          | Itinerary (1,\*) — Activity (0,\*)               | Order, Day, StartTime                    | Visit                                |
| Visit                 | Assignment — Itinerary Composition | Visits        | N:M          | Assignment (0,\*) — Itinerary Composition (0,\*) | Comment, Rating, Status                  | —                                    |
| Authorization         | Guide — Package                    | Authorizes    | N:M          | Guide (0,\*) — Package (0,\*)                    | CanGenerate, CanValidate                 | —                                    |
| Booking               | Tourist — Package                  | To Book       | N:M          | Tourist (0,\*) — Package (0,\*)                  | BookingDate                              | —                                    |

## 4. Esquema Lógico Relacional

### Entidades:

**User**(<u>ID</u>, Name, Email, Role, Specialty, Age, ID_TravelGroup)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_TravelGroup REFERENCES TravelGroup(ID)*

**TravelGroup**(<u>ID</u>, Name, ID_Guide)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*

**Package**(<u>ID</u>, Name, Destination, Status, CreationDate, ID_Admin)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Admin REFERENCES User(ID)*

**Itinerary**(<u>ID</u>, CreationDate, Status, ActivityCount, ID_Package, ID_Guide)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*

**ActivityType**(<u>Code</u>, Name)

**Category**(<u>ID</u>, Name)

**Attraction**(<u>ID</u>, Name, Address, Latitude, Longitude)

**Activity**(<u>ID</u>, Name, EffortLevel, Duration, Status, CreationDate, Code_Type, ID_Category, ID_Guide, ID_Attraction)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: Code_Type REFERENCES ActivityType(Code)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Category REFERENCES Category(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Attraction REFERENCES Attraction(ID)*

### Interrelaciones:

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

**ItineraryValidation**(<u>ID_Itinerary</u>, <u>ID_Guide</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*

**ItineraryApproval**(<u>ID_Itinerary</u>, <u>ID_Manager</u>, ApprovalDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Manager REFERENCES User(ID)*

**PackageValidation**(<u>ID_Package</u>, <u>ID_Manager</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Manager REFERENCES User(ID)*

**ActivityValidation**(<u>ID_Activity</u>, <u>ID_Admin</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Activity REFERENCES Activity(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Admin REFERENCES User(ID)*

**Assignment**(<u>ID_Itinerary</u>, <u>ID_Tourist</u>, AssignmentDate, Status, ID_Admin)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Tourist REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Admin REFERENCES User(ID)*

**ModificationRequest**(<u>ID_Itinerary</u>, <u>ID_Tourist</u>, <u>ID_Guide</u>, <u>RequestDate</u>, Description, Status, Result)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: (ID_Itinerary, ID_Tourist) REFERENCES Assignment(ID_Itinerary, ID_Tourist)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*

**ItineraryComposition**(<u>ID_Itinerary</u>, <u>ID_Activity</u>, Order, Day, StartTime)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Activity REFERENCES Activity(ID)*

**Visit**(<u>ID_Itinerary</u>, <u>ID_Tourist</u>, <u>ID_Activity</u>, Comment, Rating, Status)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: (ID_Itinerary, ID_Tourist) REFERENCES Assignment(ID_Itinerary, ID_Tourist)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: (ID_Itinerary, ID_Activity) REFERENCES ItineraryComposition(ID_Itinerary, ID_Activity)*

**Authorization**(<u>ID_Guide</u>, <u>ID_Package</u>, CanGenerate, CanValidate)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Guide REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*

**Booking**(<u>ID_Tourist</u>, <u>ID_Package</u>, BookingDate)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Tourist REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
