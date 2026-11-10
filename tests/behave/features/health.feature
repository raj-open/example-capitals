Feature: Health
  The API reports whether it and its database are alive.

  Scenario: Without a database the API is not healthy
    When I request "GET /health"
    Then the response status is 503
    And the response body is {"ok":false}
