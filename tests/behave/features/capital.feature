Feature: Capitals
  Capital cities can be viewed, created, edited and deleted.
  (These scenarios run without a database: the full cycle is covered by /tests/integration.)

  Scenario: An invalid capital is rejected
    When I send "POST /capital" with body {"name": "", "country": "France", "latitude": 0, "longitude": 0}
    Then the response status is 400

  Scenario: Coordinates out of range are rejected
    When I send "POST /capital" with body {"name": "Paris", "country": "France", "latitude": 91, "longitude": 0}
    Then the response status is 400

  Scenario: A capital with an invalid id cannot be updated
    When I send "PUT /capital/not-an-id" with body {"name": "Paris", "country": "France", "latitude": 48.86, "longitude": 2.35}
    Then the response status is 404

  Scenario: A capital with an invalid id cannot be deleted
    When I request "DELETE /capital/not-an-id"
    Then the response status is 404

  Scenario: Other cities are rejected by /capital
    When I send "POST /capital" with body {"name": "Osaka", "country": "Japan", "latitude": 34.69, "longitude": 135.5, "capital": false}
    Then the response status is 400
