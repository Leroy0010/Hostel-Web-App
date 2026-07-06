package com.leroy.hostelbackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Bare "does the application context wire up" smoke test.
 *
 * <p>The persistence layer (DataSource, Hibernate, Liquibase) is
 * deliberately excluded here. This project's schema is Liquibase-managed
 * against a real PostgreSQL + PostGIS instance with
 * {@code hibernate.ddl-auto=validate}, so any test that lets that layer
 * initialize needs an actual running database — which CI runners and
 * local sandboxes don't always have. Excluding it keeps this test focused
 * on what it's actually meant to check (bean wiring, security config,
 * MVC setup) without turning it into a de-facto integration test.
 *
 * <p>For tests that genuinely need the database, prefer a Testcontainers-backed
 * {@code @SpringBootTest} rather than re-enabling these autoconfigurations here.
 */
@SpringBootTest(properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.liquibase.autoconfigure.LiquibaseAutoConfiguration"
})
class HostelBackendApplicationTests {

    @Test
    void contextLoads() {
    }

}
