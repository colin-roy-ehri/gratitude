# Repository File Structure Summary

This repository is organized as follows:

- **LICENSE**: Project license information.
- **UX designs.txt, UX flows.txt, UX requirements.txt**: Documentation files describing user experience designs, flows, and requirements.
- **schemas/**
  - `MessageSchema.json`: Contains the schema definition for messages used in the project.
- **use cases/**
  - `ValidationRules.js`: JavaScript file defining validation rules for use cases.
  - `basic response.json`: Example of a basic response use case in JSON format.
  - **brokered examples/**
    - `Message Structure.json`: Example message structure for brokered scenarios.
    - `include broker.json`: Example including a broker in the use case.
    - `mid convo broker.json`: Example of a mid-conversation broker scenario.
    - `multiple helpers.json`: Example involving multiple helpers in a brokered scenario.
  - **primary example/**
    - `Completion.json`: Example of a completion use case.
    - `Coordination.json`: Example of a coordination use case.
    - `Need.json`: Example of a need use case.
    - `Offer.json`: Example of an offer use case.

This structure supports documentation, schema definitions, and a variety of use case examples for agents and message flows.