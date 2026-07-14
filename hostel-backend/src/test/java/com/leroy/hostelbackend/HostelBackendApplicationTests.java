package com.leroy.hostelbackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Bare "does the application context wire up" smoke test.
 *
 * <p><strong>Requires a real, reachable PostgreSQL + PostGIS instance</strong>
 * matching {@code application.yaml}'s datasource configuration. This is not
 * optional: {@code SecurityConfig} — needed by essentially every bean in the
 * app — requires {@code CustomUserDetailsService}, which requires the
 * {@code UserRepository} Spring Data JPA repository, which can only be
 * created once the persistence layer (DataSource -> Hibernate -> the
 * Liquibase-managed schema, since {@code hibernate.ddl-auto=validate})
 * has successfully initialized.
 *
 * <p>An earlier version of this test tried excluding
 * {@code DataSourceAutoConfiguration}/{@code HibernateJpaAutoConfiguration}/
 * {@code LiquibaseAutoConfiguration} to avoid needing a database at all. That
 * doesn't work: excluding {@code DataSourceAutoConfiguration} also prevents
 * Spring Data JPA from creating <em>any</em> repository bean, so the app
 * fails to start with a much more confusing
 * {@code NoSuchBeanDefinitionException} for {@code UserRepository} — worse
 * than the original, honest "can't reach the database" failure this project
 * will show without one running. There's no reasonable subset of beans to
 * exclude here without excluding half the app, so this test just states its
 * real requirement instead.
 *
 * <p>If you're running {@code mvn test} outside the environment where your
 * database is normally reachable (e.g. bare on a host machine when Postgres
 * is otherwise only reachable via a Docker Compose network hostname), either
 * point the datasource at a reachable host for local runs, or skip this
 * specific test (e.g. {@code -Dtest='!HostelBackendApplicationTests'}) until
 * a Testcontainers-backed version replaces it.
 */
@SpringBootTest
class HostelBackendApplicationTests {

    @Test
    void contextLoads() {
    }

}
