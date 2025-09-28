import { AuthService } from "./auth.service";
import { UsersRepository } from "users/users.repository";
import * as bcrypt from "bcrypt";
import { BadRequestError, UnauthenticatedError } from "api/api.errors";
import { User } from "users/users.validation";
import { DatabaseService } from "interfaces/database.interface";
import { UserService } from "users/users.service";

// Mock the AuthRepository
jest.mock("users/users.repository");

// Mock the bcrypt module
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
    created_at: new Date(),
    updated_at: new Date(),
    stripe_customer_id: null
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    mockUsersRepository = new UsersRepository(
      {} as DatabaseService
    ) as jest.Mocked<UsersRepository>;
    authService = new AuthService(new UserService(mockUsersRepository));
  });

  describe("user registration", () => {
    it("should successfully register a new user", async () => {
      // Mock repository methods
      mockUsersRepository.findUserByEmail.mockResolvedValue(null);
      mockUsersRepository.createUser.mockResolvedValue(mockUser);
      // Mock the bcrypt.hash method
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockUser.password);

      const result = await authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123"
      });

      const { password: _password, ...userWithoutPassword } = mockUser;
      expect(result).toMatchObject(userWithoutPassword);
    });

    it("should throw an error if email already exists", async () => {
      mockUsersRepository.findUserByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          username: "testuser",
          email: "test@example.com",
          password: "password123"
        })
      ).rejects.toThrow(BadRequestError);
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

      const { password: _password, ...userWithoutPassword } = mockUser;
      expect(result).toMatchObject(userWithoutPassword);
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

      const { password: _password, ...userWithoutPassword } = mockUser;
      expect(result).toMatchObject(userWithoutPassword);
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
