FROM rust:1.82 AS build

# create a new empty shell project
RUN USER=root cargo new --bin discord-tracker-action
WORKDIR /discord-tracker-action

# copy over your manifests
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

# this build step will cache your dependencies
RUN cargo build --release
RUN rm src/*.rs

# copy your source tree
COPY ./src ./src

# build for release
RUN rm ./target/release/deps/discord_tracker*
RUN cargo build --release

# our final base
FROM gcr.io/distroless/cc AS runtime

# copy the build artifact from the build stage
COPY --from=build /discord-tracker-action/target/release/discord-tracker-action .

# set the startup command to run your binary
ENTRYPOINT ["./discord-tracker-action"] 