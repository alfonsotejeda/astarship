## 1. Entidades

| Entidad      | Atributos                                                        |
| ------------ | ---------------------------------------------------------------- |
| User         | <u>ID</u>, Name, Role                                            |
| Permission   | <u>ID</u>, Name                                                  |
| TravelGroup  | <u>ID</u>, Name                                                  |
| Package      | <u>ID</u>, Name, Destination, Validated                          |
| Category     | <u>ID</u>, Name                                                  |
| ActivityType | <u>Code</u>, Name                                                |
| Activity     | <u>ID</u>, Name, EffortLevel, Duration                           |
| Attraction   | <u>ID</u>, Name, Address, Latitude, Longitude                    |
| Itinerary    | <u>ID</u>, CreationDate, SubmittedDate, ActivityCount, Validated |

> La **red de conexiones entre atracciones** (tiempos y costos de transporte) no forma parte
> de este esquema: el enunciado exige gestionarla de forma independiente. Aquí solo viven
> las atracciones como puntos; la red las referencia por `Attraction.ID`.

## 2. Interrelaciones

### 2.1 Sin atributos

| Interrelación     | Participantes           | Cardinalidad | (min,max)                            |
| ----------------- | ----------------------- | ------------ | ------------------------------------ |
| Belongs           | User — TravelGroup      | N:1          | User (1,1) — TravelGroup (1,\*)      |
| Classifies        | Activity — Category     | N:1          | Activity (1,1) — Category (0,\*)     |
| Is of Type        | Activity — ActivityType | N:1          | Activity (1,1) — ActivityType (0,\*) |
| Describes         | Activity — User         | N:1          | Activity (1,1) — User (0,\*)         |
| Takes Place At    | Activity — Attraction   | N:1          | Activity (1,1) — Attraction (0,\*)   |
| Belongs To        | Itinerary — Package     | N:1          | Itinerary (1,1) — Package (0,\*)     |
| Generates         | Itinerary — User        | N:1          | Itinerary (1,1) — User (0,\*)        |
| Generates Package | Package — User          | N:1          | Package (1,1) — User (0,\*)          |
| Booking           | User — Package          | N:M          | User (0,\*) — Package (0,\*)         |
| Coverage          | Package — Category      | N:M          | Package (1,\*) — Category (0,\*)     |
| Have              | User — Permission       | N:M          | User (0,\*) — Permission (0,\*)      |
| To Itinerary      | Permission — Itinerary  | N:M          | Permission (0,\*) — Itinerary (0,\*) |
| To Package        | Permission — Package    | N:M          | Permission (0,\*) — Package (0,\*)   |

### 2.2 Con atributos

| Interrelación        | Participantes             | Cardinalidad | (min,max)                              | Atributos                            |
| --------------------- | -------------------------- | ------------ | ---------------------------------------- | ------------------------------------- |
| ProportionType        | Itinerary — ActivityType   | N:M          | Itinerary (1,\*) — ActivityType (0,\*)   | Value                                  |
| ProportionCategory    | Itinerary — Category       | N:M          | Itinerary (1,\*) — Category (0,\*)       | Value                                  |
| Validation            | Itinerary — User           | N:M          | Itinerary (0,\*) — User (0,\*)           | ValidationDate, Result, Observations   |
| PackageValidation     | Package — User             | N:M          | Package (0,\*) — User (0,\*)             | ValidationDate, Result, Observations   |
| Visit                 | Assignment — Composition   | N:M          | Assignment (0,\*) — Composition (0,\*)   | Status, Rating, Comment                |
| ModificationRequest   | Assignment — User          | N:M          | Assignment (0,\*) — User (0,\*)          | RequestDate, Description, Status, Result |

## 3. Interrelaciones convertidas en agregaciones

| Agregación  | Participantes         | Cardinalidad | (min,max)                           | Atributos                        | Usada por                   |
| ----------- | ---------------------- | ------------ | ------------------------------------- | ---------------------------------- | ----------------------------- |
| Composition | Itinerary — Activity   | N:M          | Itinerary (1,\*) — Activity (0,\*)   | Order, Day, StartTime               | Visit                         |
| Assignment  | Itinerary — User       | N:M          | Itinerary (0,\*) — User (0,\*)       | AssignmentDate, Rating, Comment    | Visit, ModificationRequest    |

## 4. Esquema Lógico Relacional

### Entidades:

**User**(<u>ID</u>, Name, Role, ID_TravelGroup)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_TravelGroup REFERENCES TravelGroup(ID)*

**Permission**(<u>ID</u>, Name)

**TravelGroup**(<u>ID</u>, Name)

**Package**(<u>ID</u>, Name, Destination, Validated, ID_Creator)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Creator REFERENCES User(ID)*

**Category**(<u>ID</u>, Name)

**ActivityType**(<u>Code</u>, Name)

**Attraction**(<u>ID</u>, Name, Address, Latitude, Longitude)

**Activity**(<u>ID</u>, Name, EffortLevel, Duration, Code_Type, ID_Category, ID_User, ID_Attraction)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: Code_Type REFERENCES ActivityType(Code)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Category REFERENCES Category(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_User REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Attraction REFERENCES Attraction(ID)*

**Itinerary**(<u>ID</u>, CreationDate, SubmittedDate, ActivityCount, Validated, ID_Package, ID_Creator)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Creator REFERENCES User(ID)*

### Interrelaciones:

**Booking**(<u>ID_User</u>, <u>ID_Package</u>)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_User REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*

**Coverage**(<u>ID_Package</u>, <u>ID_Category</u>)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Category REFERENCES Category(ID)*

**ProportionType**(<u>ID_Itinerary</u>, <u>Code_Type</u>, Value)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: Code_Type REFERENCES ActivityType(Code)*

**ProportionCategory**(<u>ID_Itinerary</u>, <u>ID_Category</u>, Value)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Category REFERENCES Category(ID)*

**Validation**(<u>ID_Itinerary</u>, <u>ID_User</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_User REFERENCES User(ID)*

**PackageValidation**(<u>ID_Package</u>, <u>ID_User</u>, ValidationDate, Result, Observations)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_User REFERENCES User(ID)*

**Visit**(<u>ID_Itinerary</u>, <u>ID_User</u>, <u>ID_Activity</u>, Status, Rating, Comment)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: (ID_Itinerary, ID_User) REFERENCES Assignment(ID_Itinerary, ID_User)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: (ID_Itinerary, ID_Activity) REFERENCES Composition(ID_Itinerary, ID_Activity)*

**ModificationRequest**(<u>ID_Itinerary</u>, <u>ID_User</u>, <u>ID_SupportUser</u>, <u>RequestDate</u>, Description, Status, Result)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: (ID_Itinerary, ID_User) REFERENCES Assignment(ID_Itinerary, ID_User)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_SupportUser REFERENCES User(ID)*

**Have**(<u>ID_User</u>, <u>ID_Permission</u>)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_User REFERENCES User(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Permission REFERENCES Permission(ID)*

**ToItinerary**(<u>ID_Permission</u>, <u>ID_Itinerary</u>)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Permission REFERENCES Permission(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*

**ToPackage**(<u>ID_Permission</u>, <u>ID_Package</u>)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Permission REFERENCES Permission(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Package REFERENCES Package(ID)*

### Agregaciones (participan en otras interrelaciones):

**Composition**(<u>ID_Itinerary</u>, <u>ID_Activity</u>, Order, Day, StartTime)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Activity REFERENCES Activity(ID)*

**Assignment**(<u>ID_Itinerary</u>, <u>ID_User</u>, AssignmentDate, Rating, Comment)
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_Itinerary REFERENCES Itinerary(ID)*
&nbsp;&nbsp;&nbsp;&nbsp;*FK: ID_User REFERENCES User(ID)*
