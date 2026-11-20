import { AuthService } from "./auth.service";
import { UsersRepository } from "users/users.repository";
import * as bcrypt from "bcrypt";
import { BadRequestError, UnauthenticatedError } from "api/api.errors";
import { User } from "users/users.validation";
import { DatabaseService } from "interfaces/database.interface";
import { UsersService } from "users/users.service";
import { paymentsService } from "__tests__/mocks";

jest.mock("users/users.repository");
jest.mock("roles/roles.repository");

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

describe("AuthService", () => {
  let authService: AuthService;
  let mockUsersRepository: jest.Mocked<UsersRepository>;

  const mockUser: User = {
    id: 123,
    username: "testuser",
    email: "test@example.com",
    password: "hashedPassword",
    role_id: 1,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsersRepository = new UsersRepository(
      {} as DatabaseService
    ) as jest.Mocked<UsersRepository>;

    authService = new AuthService(new UsersService(mockUsersRepository, paymentsService));
  });

  describe("user registration", () => {
    it("should successfully register a new user", async () => {
      mockUsersRepository.createUser.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");

      const result = await authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123"
      });

      expect(result).toEqual(mockUser);
    });
  });

  describe("user login", () => {
    it("should successfully login a user", async () => {
      mockUsersRepository.findUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: "test@example.com",
        password: "password123"
      });

      expect(result).toEqual(mockUser);
    });

    it("should throw an error if the user does not exist", async () => {
      mockUsersRepository.findUserByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "doesnotexist@example.com",
          password: "password123"
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw an error for invalid credentials", async () => {
      mockUsersRepository.findUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "wrongpassword"
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("check if user is logged in", () => {
    it("should return user data if logged in", async () => {
      mockUsersRepository.findUserById.mockResolvedValue(mockUser);

      const result = await authService.isLoggedIn(mockUser);

      expect(result).toEqual(mockUser);
    });

    it("should throw an error if no userId provided", async () => {
      await expect(authService.isLoggedIn(undefined)).rejects.toThrow(UnauthenticatedError);
    });

    it("should throw an error if user not found", async () => {
      mockUsersRepository.findUserById.mockResolvedValue(null);
      await expect(authService.isLoggedIn()).rejects.toThrow(UnauthenticatedError);
    });
  });
});
