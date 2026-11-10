Feature: Health
  The API reports whether it is alive.

  Scenario: The API is alive
    When I request "GET /health"
    Then the response status is 200
    And the response body is {"ok":true}
