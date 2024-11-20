import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Typography,
  Button,
} from "@material-tailwind/react";

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
  ownerName: string;
}

interface PlaylistSelectorAdvancedProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
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
    const divs: any = [];
    categories.forEach((oneCategory: Category) => {
      divs.push(
        <div key={oneCategory.id}>
          <a
            href="#"
            onClick={() => {
              getPlaylistsInCategory(oneCategory.id);
            }}
          >
            <Card className="mt-6 w-96">
              <CardHeader color="blue-gray">
                <img src={oneCategory.firstIconUrl} alt={oneCategory.name} />
              </CardHeader>
              <CardBody>
                <Typography variant="h5" color="blue" className="mb-2">
                  {oneCategory.name}
                </Typography>
                <Typography>{oneCategory.id}</Typography>
              </CardBody>
              {/* <CardFooter className="pt-0">
          <Button>Read More</Button>
        </CardFooter> */}
            </Card>
          </a>
        </div>
      );
    });
    return divs;
  };

  const getPlaylistsGridCells = () => {
    const divs: any = [];
    playlists.forEach((onePlaylist: Playlist) => {
      divs.push(
        <div key={onePlaylist.id}>
          <a
            href="#"
            onClick={() => {
              //getPlaylistsInCategory(onePlaylist.id);
            }}
          >
            <Card className="mt-6 w-96">
              <CardHeader color="blue-gray">
                <img src={onePlaylist.firstIconUrl} alt={onePlaylist.name} />
              </CardHeader>
              <CardBody>
                <Typography variant="h5" color="blue" className="mb-2">
                  {onePlaylist.name}
                </Typography>
                <Typography>{onePlaylist.id}</Typography>
              </CardBody>
              {/* <CardFooter className="pt-0">
          <Button>Read More</Button>
        </CardFooter> */}
            </Card>
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
          ownerName: oneItem.owner?.displayName ?? "",
        })
      );
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

  useEffect(() => {
    getCategories();
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {categories && getCategoriesGridCells()}
      </div>
    </>
  );
};

export default PlaylistSelectorAdvanced;
