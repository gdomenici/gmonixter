import React, { useState, useEffect } from "react";
import { getToken } from "./components/Utils";

interface Category {
  fullDetailsUrl: string;
  firstIconUrl: string;
  id: string;
  name: string;
}

interface Playlist {
  id: string;
  name: string;
  firstIconUrl: string;
  description: string;
  url: string;
  ownerName: string;
}

interface PlaylistSelectorAdvancedProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setPlaylistUrl: React.Dispatch<React.SetStateAction<string>>;
  setPlaylistName: React.Dispatch<React.SetStateAction<string>>;
}

const PlaylistSelectorAdvanced: React.FC<PlaylistSelectorAdvancedProps> = (
  props: PlaylistSelectorAdvancedProps
) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const getCategories = async () => {
    try {
      props.setLoading(false);
      props.setError(null);

      const token = getToken();
      const response = await fetch(
        `https://api.spotify.com/v1/browse/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch playlist categories");
      }

      const data = await response.json();

      const tempCategories: Category[] = data.categories.items.map(
        (oneItem: any) => ({
          fullDetailsUrl: oneItem.href,
          firstIconUrl: oneItem.icons?.[0]?.url,
          id: oneItem.id,
          name: oneItem.name,
        })
      );

      setCategories(tempCategories);
    } catch (err) {
      if (err instanceof Error) {
        props.setError(err.message);
      } else {
        props.setError("An unexpected error occurred");
      }
    } finally {
      props.setLoading(false);
    }
  };

  const getCategoriesGridCells = () => {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((oneCategory, index) => (
            <div
              key={index}
              className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              <a
                href="#"
                onClick={() => {
                  getPlaylistsInCategory(oneCategory.id);
                }}
              >
                {/* Card Header */}
                <div className="relative h-48 w-full">
                  <img
                    src={oneCategory.firstIconUrl}
                    alt={oneCategory.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3">
                    <h2 className="text-lg font-semibold">
                      {oneCategory.name}
                    </h2>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-gray-600">{oneCategory.id}</p>
                </div>

                {/* Optional Card Footer */}
                {/* {card.footer && (
                <div className="border-t border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm text-gray-500">{card.footer}</p>
                </div>
              )} */}
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getPlaylistsGridCells = () => {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {playlists.map((onePlaylist, index) => (
            <div
              key={index}
              className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              <a
                href="#"
                onClick={() => {
                  props.setPlaylistName(onePlaylist.name);
                  props.setPlaylistUrl(onePlaylist.url);
                }}
              >
                {/* Card Header */}
                <div className="relative h-48 w-full">
                  <img
                    src={onePlaylist.firstIconUrl}
                    alt={onePlaylist.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3">
                    <h2 className="text-lg font-semibold">
                      {onePlaylist.name}
                    </h2>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-gray-600">
                    Start game with this playlist!
                  </p>
                </div>

                {/* Optional Card Footer */}
                {/* {card.footer && (
                <div className="border-t border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm text-gray-500">{card.footer}</p>
                </div>
              )} */}
              </a>
            </div>
          ))}
        </div>
      </div>
    );

    const divs: any = [];
    playlists.forEach((onePlaylist: Playlist) => {
      divs.push(
        <div key={onePlaylist.id}>
          <a
            href="#"
            onClick={() => {
              props.setPlaylistName(onePlaylist.name);
              props.setPlaylistUrl(onePlaylist.url);
            }}
          >
            {/* <Card className="mt-6 w-96">
              <CardHeader color="blue-gray">
                <img src={onePlaylist.firstIconUrl} alt={onePlaylist.name} />
              </CardHeader>
              <CardBody>
                <Typography variant="h5" color="blue" className="mb-2">
                  {onePlaylist.name}
                </Typography>
                <Typography>Start game with this playlist!</Typography>
              </CardBody>
            </Card> */}
          </a>
        </div>
      );
    });
    return divs;
  };

  const getPlaylistsInCategory = async (categoryID: string) => {
    try {
      props.setLoading(true);
      props.setError(null);

      const token = getToken();
      const response = await fetch(
        `https://api.spotify.com/v1/browse/categories/${categoryID}/playlists`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch playlists for category");
      }

      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));

      const tempPlaylists: Playlist[] = data.playlists?.items?.map(
        (oneItem: any) => ({
          id: oneItem.id,
          name: oneItem.name,
          firstIconUrl: oneItem.images?.[0]?.url,
          description: oneItem.description,
          url: oneItem.external_urls?.spotify,
          ownerName: oneItem.owner?.displayName ?? "",
        })
      );
      setCategories([]);
      setPlaylists(tempPlaylists);
    } catch (err) {
      if (err instanceof Error) {
        props.setError(err.message);
      } else {
        props.setError("An unexpected error occurred");
      }
    } finally {
      props.setLoading(false);
    }
  };

  // setPlaylists([]);
  // setCategories([]);
  useEffect(() => {
    getCategories();
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {categories && getCategoriesGridCells()}
        {playlists && getPlaylistsGridCells()}
      </div>
    </>
  );
};

export default PlaylistSelectorAdvanced;
